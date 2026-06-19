"use client";

import { format, parseISO } from "date-fns";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import OrderBreakdownLineItems from "@/components/booking/OrderBreakdownLineItems";
import {
  PAYMENT_WINDOW_MINUTES,
  formatSlotTime,
  useIsClient,
} from "@/components/checkout/helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LineItemSlotInput, useSpeculatedLineItemsQuery } from "@/lib/api/lineItem";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useConfirmPaymentMutation, useInitiateTransactionMutation } from "@/lib/api/transactionApi";
import {
  buildCheckoutLoginNext,
  clearCheckoutDraft,
  loadPendingCheckoutTransaction,
  resolveCheckoutDraft,
  savePendingCheckoutTransaction,
  clearPendingCheckoutTransaction,
} from "@/lib/checkout/draft";
import { useAuth } from "@/lib/hooks/useAuth";
import { ETransactionState, Transaction } from "@/lib/types/transaction";

function DraftSlotsPreview({ slots }: { slots: LineItemSlotInput[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your selection</CardTitle>
        <CardDescription>
          {slots.length} {slots.length === 1 ? "slot" : "slots"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {slots.map((slot) => (
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

  const [confirmPayment, { isLoading: isConfirmingPayment }] =
    useConfirmPaymentMutation();

  const isLoading = isInitiating || isConfirmingPayment;

  const [initError, setInitError] = useState<unknown>(null);

  const pendingTransaction = isClient
    ? loadPendingCheckoutTransaction()
    : null;

  const draft = isClient ? resolveCheckoutDraft(search) : null;

  const courtId = draft?.court_id ?? pendingTransaction?.bookings?.[0]?.court;


  const pendingSlots = pendingTransaction?.bookings.map((booking) => ({
    date: booking.date,
    start: booking.start_time,
    end: booking.end_time,
  })) ?? [];
  const draftSlots = draft?.slots ?? [];
  const slots = draftSlots.length > 0 ? draftSlots : pendingSlots;

  const { data: speculatedLineItems, isLoading: isSpeculateLoading } =
    useSpeculatedLineItemsQuery(
      {
        courtId: String(courtId),
        slots,
      },
      { skip: !courtId || slots.length === 0 },
    );

  useEffect(() => {
    if (!isClient || !pendingTransaction || pendingTransaction.current_state !== ETransactionState.PENDING_PAYMENT) {
      return;
    }
    clearCheckoutDraft();
    clearPendingCheckoutTransaction();
    router.push(`/transaction/${pendingTransaction.id}`);
  }, [pendingTransaction, isClient, router]);

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

    //step 1: initiate transaction
    const onInitiateTransaction = async (pendingTransaction: Transaction | null) => {
      const hasPendingPayment = pendingTransaction?.current_state === ETransactionState.PENDING_PAYMENT;
      if (hasPendingPayment) {
        return Promise.resolve(pendingTransaction);
      }

      const newTransaction = await initiateTransaction({
        court_id: draft.court_id,
        slots: draft.slots,
      }).unwrap();
      savePendingCheckoutTransaction(newTransaction);
      clearCheckoutDraft();
      return Promise.resolve(newTransaction);
    };
    //step 2: auto confirm payment
    const onAutoConfirmPayment = async (transaction: Transaction | null) => {
      if (!transaction) {
        return Promise.resolve(null);
      }
      const alreadyConfirmed = transaction.current_state === ETransactionState.CONFIRMED;
      if (alreadyConfirmed) {
        return Promise.resolve(transaction);
      }
      const confirmedTransaction = await confirmPayment(transaction.id).unwrap();
      savePendingCheckoutTransaction(confirmedTransaction);
      return Promise.resolve(confirmedTransaction);
    };
    //step 3: navigate to transaction details
    const onNavigateToTransactionDetails = async (transaction: Transaction | null) => {
      if (!transaction) {
        return Promise.resolve(null);
      }
      clearPendingCheckoutTransaction();
      router.push(`/transaction/${transaction.id}`);
      return Promise.resolve(transaction);
    };

    const applyAsync = (acc: Promise<Transaction | null>, val: (x: Transaction | null) => Promise<Transaction | null>) => acc.then(val);
    const composeAsync = (...funcs: ((x: Transaction | null) => Promise<Transaction | null>)[]) => (x: Transaction | null) => funcs.reduce(applyAsync, Promise.resolve(x));
    const handler = composeAsync(onInitiateTransaction, onAutoConfirmPayment, onNavigateToTransactionDetails);
    const transaction = await handler(pendingTransaction);
    return transaction;
  };

  console.log({ courtId, slots })

  if (!courtId || slots.length === 0) {
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
          <DraftSlotsPreview slots={slots} />
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
            <CardContent className="space-y-3">
              {initError ? (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(initError)}
                </p>
              ) : null}
              <Button
                className="w-full"
                size="lg"
                isLoading={isLoading}
                disabled={isSpeculateLoading || !speculatedLineItems}
                onClick={onCreateBooking}
              >
                {pendingTransaction && pendingTransaction.current_state === ETransactionState.PENDING_PAYMENT ? "Confirm payment" : "Create booking"}
              </Button>
              {pendingTransaction && pendingTransaction.current_state !== ETransactionState.PENDING_PAYMENT ? (
                <p className="text-center text-xs text-muted-foreground">
                  You will be able to confirm payment in {PAYMENT_WINDOW_MINUTES} minutes.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
