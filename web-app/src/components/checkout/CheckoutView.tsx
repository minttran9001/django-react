"use client";

import { format, formatDistanceStrict, parseISO } from "date-fns";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import OrderBreakdownLineItems from "@/components/booking/OrderBreakdownLineItems";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSpeculatedLineItemsQuery } from "@/lib/api/lineItem";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  useConfirmPaymentMutation,
  useGetTransactionQuery,
  useInitiateTransactionMutation,
} from "@/lib/api/transactionApi";
import {
  buildCheckoutLoginNext,
  clearCheckoutDraft,
  clearCheckoutSession,
  loadPendingCheckoutTransactionId,
  resolveCheckoutDraft,
  savePendingCheckoutTransactionId,
  type CheckoutDraft,
} from "@/lib/checkout/draft";
import { useAuth } from "@/lib/hooks/useAuth";
import { getMediaUrl } from "@/lib/media";
import { TRANSACTION_STATE, toLineItemsResponse } from "@/lib/types/transaction";
import { cn } from "@/lib/utils";

const PAYMENT_WINDOW_MINUTES = 15;

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, "h:mm a");
}

function StatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "warning" &&
          "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
        tone === "success" &&
          "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
        tone === "default" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function PaymentCountdown({ expiresAt }: { expiresAt: Date }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const expired = now >= expiresAt;
  const remaining = expired
    ? "Payment window expired"
    : `Complete payment within ${formatDistanceStrict(expiresAt, now)}`;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        expired
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
      )}
    >
      <ClockIcon className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">{remaining}</p>
        <p className="mt-0.5 text-xs opacity-80">
          Your slot reservation is held until {format(expiresAt, "h:mm a")}.
          Unpaid bookings are released automatically.
        </p>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
      <Avatar size="lg">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback>{initials || "VN"}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm text-muted-foreground">Hosted by</p>
        <p className="font-medium">{name || "Venue host"}</p>
      </div>
    </div>
  );
}

function DraftSlotsPreview({ draft }: { draft: CheckoutDraft }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your selection</CardTitle>
        <CardDescription>
          {draft.slots.length} {draft.slots.length === 1 ? "slot" : "slots"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft.slots.map((slot) => (
          <div
            key={`${slot.date}-${slot.start}-${slot.end}`}
            className="rounded-lg border bg-muted/30 px-4 py-3"
          >
            <p className="font-medium">
              {format(parseISO(slot.date), "EEEE, MMM d, yyyy")}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatSlotTime(slot.start)} – {formatSlotTime(slot.end)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CheckoutDraftView({ search }: { search: string }) {
  const router = useRouter();
  const isClient = useIsClient();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [initiateTransaction, { isLoading: isInitiating }] =
    useInitiateTransactionMutation();
  const [initError, setInitError] = useState<unknown>(null);

  const pendingTransactionId = isClient
    ? loadPendingCheckoutTransactionId()
    : null;
  const draft = isClient ? resolveCheckoutDraft(search) : null;

  useEffect(() => {
    if (pendingTransactionId) {
      router.replace(`/checkout/${pendingTransactionId}`);
    }
  }, [pendingTransactionId, router]);

  const { data: speculatedLineItems, isLoading: isSpeculateLoading } =
    useSpeculatedLineItemsQuery(
      {
        courtId: String(draft?.court_id ?? ""),
        slots: draft?.slots ?? [],
      },
      { skip: !draft },
    );

  useEffect(() => {
    if (!isClient || !draft) {
      return;
    }

    if (!isAuthLoading && !isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(buildCheckoutLoginNext())}`,
      );
    }
  }, [draft, isAuthLoading, isAuthenticated, isClient, router]);

  const onCreateBooking = async () => {
    if (!draft) {
      return;
    }

    setInitError(null);

    try {
      const transaction = await initiateTransaction({
        court_id: draft.court_id,
        slots: draft.slots,
      }).unwrap();

      savePendingCheckoutTransactionId(transaction.id);
      clearCheckoutDraft();
      router.push(`/checkout/${transaction.id}`);
    } catch (error) {
      setInitError(error);
      toast.error(getApiErrorMessage(error));
    }
  };

  if (!isClient || pendingTransactionId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!draft) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircleIcon className="size-5 text-destructive" />
            Invalid checkout link
          </CardTitle>
          <CardDescription>
            Select a court and time slot from a listing to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/listings">
              <ArrowLeftIcon />
              Back to listings
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href="/listings">
            <ArrowLeftIcon />
            Back to listings
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Checkout
        </h1>
        <p className="text-sm text-muted-foreground">
          Review your selection and create a booking to reserve your slots.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <DraftSlotsPreview draft={draft} />
          <div className="flex items-start gap-3 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              Slots are not reserved yet. Click create booking to hold your
              selected times for {PAYMENT_WINDOW_MINUTES} minutes while you pay.
            </p>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          {isSpeculateLoading || !speculatedLineItems ? (
            <div className="flex justify-center rounded-lg bg-muted/60 py-12">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <OrderBreakdownLineItems
              speculatedLineItemsData={speculatedLineItems}
              includeFor={["customer"]}
            />
          )}

          <Card>
            <CardContent className="space-y-3 pt-6">
              {initError ? (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(initError)}
                </p>
              ) : null}
              <Button
                className="w-full"
                size="lg"
                isLoading={isInitiating}
                disabled={isSpeculateLoading || !speculatedLineItems}
                onClick={onCreateBooking}
              >
                Create booking
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                You will be able to confirm payment on the next step.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CheckoutTransactionView({
  transactionId,
}: {
  transactionId: number;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    data: transaction,
    isLoading,
    isError,
    error,
  } = useGetTransactionQuery(transactionId, { skip: !isAuthenticated });
  const [confirmPayment, { isLoading: isConfirming }] =
    useConfirmPaymentMutation();

  const expiresAt = useMemo(() => {
    if (!transaction?.last_transition_at) {
      return null;
    }
    const startedAt = parseISO(transaction.last_transition_at);
    return new Date(startedAt.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000);
  }, [transaction]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(`/checkout/${transactionId}`)}`,
      );
    }
  }, [isAuthLoading, isAuthenticated, router, transactionId]);

  useEffect(() => {
    if (transaction?.current_state === TRANSACTION_STATE.CONFIRMED) {
      clearCheckoutSession();
    }
  }, [transaction?.current_state]);

  const onConfirmPayment = async () => {
    try {
      await confirmPayment(transactionId).unwrap();
      toast.success("Payment confirmed", {
        description: "Your court booking is confirmed.",
      });
    } catch (confirmError) {
      toast.error(getApiErrorMessage(confirmError));
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !transaction) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircleIcon className="size-5 text-destructive" />
            Checkout unavailable
          </CardTitle>
          <CardDescription>
            {getApiErrorMessage(error) || "This transaction could not be loaded."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/listings">
              <ArrowLeftIcon />
              Back to listings
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPendingPayment =
    transaction.current_state === TRANSACTION_STATE.PENDING_PAYMENT;
  const isConfirmed =
    transaction.current_state === TRANSACTION_STATE.CONFIRMED;
  const providerAvatarUrl = getMediaUrl(transaction.provider.avatar?.url);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/listings">
              <ArrowLeftIcon />
              Back to listings
            </Link>
          </Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Checkout
          </h1>
          <p className="text-sm text-muted-foreground">
            Booking #{transaction.id} · {transaction.process_name}
          </p>
        </div>
        <StatusBadge
          label={transaction.current_state_display}
          tone={
            isConfirmed ? "success" : isPendingPayment ? "warning" : "default"
          }
        />
      </div>

      {isConfirmed ? (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Booking confirmed</p>
            <p className="mt-0.5 text-xs opacity-80">
              Payment received. See you on the court!
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          {isPendingPayment && expiresAt ? (
            <PaymentCountdown expiresAt={expiresAt} />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Your booking</CardTitle>
              <CardDescription>
                {transaction.bookings.length}{" "}
                {transaction.bookings.length === 1 ? "slot" : "slots"} reserved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {transaction.bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {format(parseISO(booking.date), "EEEE, MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatSlotTime(booking.start_time)} –{" "}
                      {formatSlotTime(booking.end_time)}
                    </p>
                  </div>
                  <StatusBadge label={booking.status_display} />
                </div>
              ))}
            </CardContent>
          </Card>

          <ProviderCard
            name={transaction.provider.name}
            avatarUrl={providerAvatarUrl}
          />

          <div className="flex items-start gap-3 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
            <p>
              Payment is processed securely. Your card is only charged when you
              confirm below.
            </p>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <OrderBreakdownLineItems
            speculatedLineItemsData={toLineItemsResponse(transaction)}
            includeFor={["customer"]}
          />

          <Card>
            <CardContent className="space-y-3 pt-6">
              <Button
                className="w-full"
                size="lg"
                disabled={!isPendingPayment}
                isLoading={isConfirming}
                onClick={onConfirmPayment}
              >
                {isConfirmed ? "Payment confirmed" : "Confirm payment"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Simulated payment for development. No card is charged.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
