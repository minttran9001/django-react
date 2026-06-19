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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import OrderBreakdownLineItems from "@/components/booking/OrderBreakdownLineItems";
import { PAYMENT_WINDOW_MINUTES, formatSlotTime } from "@/components/checkout/helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewForm } from "@/components/form";
import Review from "@/components/ui/Review";
import { RequestReviewFormValues } from "@/features/auth/schemas/reviewSchema";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  useConfirmPaymentMutation,
  useGetTransactionQuery,
  useRequestReviewMutation,
} from "@/lib/api/transactionApi";
import { clearCheckoutSession } from "@/lib/checkout/draft";
import { useAuth } from "@/lib/hooks/useAuth";
import { getMediaUrl } from "@/lib/media";
import {
  ETransactionBookingStatus,
  ETransactionState,
  Transaction,
  toLineItemsResponse,
} from "@/lib/types/transaction";
import { cn } from "@/lib/utils";

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

function TransactionActions({ transaction }: { transaction: Transaction }) {
  const [requestReview] = useRequestReviewMutation();
  const [confirmPayment, { isLoading: isConfirming }] =
    useConfirmPaymentMutation();

  const nextBookingStartsAt = useMemo(() => {
    const nextBooking = transaction.bookings
      .filter(
        (booking) => booking.status === ETransactionBookingStatus.CONFIRMED,
      )
      .sort(
        (a, b) =>
          parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime(),
      )[0];
    if (!nextBooking) {
      return null;
    }
    return new Date(nextBooking.date + " " + nextBooking.start_time);
  }, [transaction.bookings]);

  const onConfirmPayment = async () => {
    try {
      await confirmPayment(transaction.id).unwrap();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const onRequestReview = async (values: RequestReviewFormValues) => {
    try {
      await requestReview({
        transactionId: transaction.id,
        rating: values.rating,
        comment: values.comment ?? "",
      }).unwrap();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  if (transaction.current_state === ETransactionState.COMPLETED) {
    return (
      <div className="w-full">
        <ReviewForm onSubmit={onRequestReview} className="mb-2" />
        <p className="text-center text-xs text-muted-foreground">
          Your booking is complete. Please leave a review to help other users
          find this venue.
        </p>
      </div>
    );
  } else if (transaction.current_state === ETransactionState.PENDING_PAYMENT) {
    return (
      <div className="w-full">
        <Button
          className="mb-2 w-full"
          onClick={onConfirmPayment}
          isLoading={isConfirming}
        >
          Confirm Payment
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Payment will be processed securely. Your card is only charged when you
          confirm below.
        </p>
      </div>
    );
  } else if (transaction.current_state === ETransactionState.PAYMENT_EXPIRED) {
    return (
      <div className="w-full">
        <p className="text-center text-xs text-muted-foreground">
          Payment window expired. Please start over.
        </p>
      </div>
    );
  } else if (transaction.current_state === ETransactionState.REVIEWED) {
    return (
      <div className="flex w-full flex-col items-center justify-center">
        <Review className="mb-2" review={transaction.review} />
        <p className="text-center text-xs text-muted-foreground">
          Your booking has been reviewed.
        </p>
      </div>
    );
  } else if (transaction.current_state === ETransactionState.CANCELLED) {
    return (
      <div className="flex w-full flex-col items-center justify-center">
        <p className="text-center text-xs text-muted-foreground">
          Your booking has been cancelled.
        </p>
      </div>
    );
  } else if (transaction.current_state === ETransactionState.CONFIRMED) {
    return (
      <div className="flex w-full flex-col items-center justify-center">
        <p className="text-center text-xs text-muted-foreground">
          Your booking has been confirmed.
        </p>
        {nextBookingStartsAt ? (
          <p className="text-center text-xs text-muted-foreground">
            Your booking will be started at{" "}
            {format(nextBookingStartsAt, "EEEE, MMM d, yyyy h:mm a")}. You will
            be notified when your booking is ready to start.
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}

export function TransactionDetailsView({
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

  const expiresAt = useMemo(() => {
    if (!transaction?.last_transition_at) {
      return null;
    }
    const startedAt = parseISO(transaction.last_transition_at);
    return new Date(
      startedAt.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000,
    );
  }, [transaction]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(`/checkout/${transactionId}`)}`,
      );
    }
  }, [isAuthLoading, isAuthenticated, router, transactionId]);

  useEffect(() => {
    if (transaction?.current_state === ETransactionState.CONFIRMED) {
      clearCheckoutSession();
    }
  }, [transaction?.current_state]);

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
            {getApiErrorMessage(error) ||
              "This transaction could not be loaded."}
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
    transaction.current_state === ETransactionState.PENDING_PAYMENT;
  const isConfirmed =
    transaction.current_state === ETransactionState.CONFIRMED;
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
            <CardContent className="space-y-3">
              <TransactionActions transaction={transaction} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
