"use client";

import { format, parseISO } from "date-fns";
import {
    CalendarIcon,
    ChevronRightIcon,
    ClockIcon,
    ReceiptIcon,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type {
    Transaction,
    TransactionBooking,
} from "@/lib/types/transaction";
import { ETransactionState } from "@/lib/types/transaction";
import { getMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type BookingsListProps = {
    transactions: Transaction[];
    emptyMessage?: string;
    className?: string;
};

type StatusTone = "default" | "warning" | "success" | "danger";

function formatSlotTime(time: string): string {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, "h:mm a");
}

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

function getStatusTone(state: number): StatusTone {
    switch (state) {
        case ETransactionState.PENDING_PAYMENT:
            return "warning";
        case ETransactionState.CONFIRMED:
        case ETransactionState.COMPLETED:
            return "success";
        case ETransactionState.PAYMENT_EXPIRED:
        case ETransactionState.CANCELLED:
            return "danger";
        default:
            return "default";
    }
}

function StatusBadge({
    label,
    tone = "default",
}: {
    label: string;
    tone?: StatusTone;
}) {
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                tone === "warning" &&
                "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
                tone === "success" &&
                "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                tone === "danger" &&
                "bg-destructive/10 text-destructive",
                tone === "default" && "bg-muted text-muted-foreground",
            )}
        >
            {label}
        </span>
    );
}

function getBookingSortKey(booking: TransactionBooking): number {
    return parseISO(booking.date).getTime();
}

function getEarliestBooking(
    bookings: TransactionBooking[],
): TransactionBooking | undefined {
    if (bookings.length === 0) {
        return undefined;
    }

    return [...bookings].sort(
        (a, b) => getBookingSortKey(a) - getBookingSortKey(b),
    )[0];
}

function getTransactionHref(transaction: Transaction): string | null {
    if (transaction.current_state === ETransactionState.PENDING_PAYMENT) {
        return `/checkout/${transaction.id}`;
    }

    if (
        [ETransactionState.CONFIRMED, ETransactionState.COMPLETED, ETransactionState.REVIEWED].includes(transaction.current_state)
    ) {
        return `/checkout/${transaction.id}`;
    }

    return null;
}

function BookingSlotSummary({ booking }: { booking: TransactionBooking }) {
    return (
        <div className="flex items-start gap-3 text-sm">
            <CalendarIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
                <p className="font-medium">
                    {format(parseISO(booking.date), "EEEE, MMM d, yyyy")}
                </p>
                <p className="text-muted-foreground">
                    {formatSlotTime(booking.start_time)} – {formatSlotTime(booking.end_time)}
                </p>
            </div>
        </div>
    );
}

export function BookingCard({ transaction }: { transaction: Transaction }) {
    const earliest = getEarliestBooking(transaction.bookings);
    const extraSlots = Math.max(0, transaction.bookings.length - 1);
    const href = getTransactionHref(transaction);
    const providerAvatarUrl = getMediaUrl(transaction.provider.avatar?.url);
    const tone = getStatusTone(transaction.current_state);
    const isPending = transaction.current_state === ETransactionState.PENDING_PAYMENT;

    const card = (
        <Card
            className={cn(
                "overflow-hidden transition-shadow",
                href && "hover:shadow-md",
            )}
        >
            <CardHeader className="gap-3 border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <CardTitle className="text-base">
                            Booking #{transaction.id}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                            {transaction.process_name.replace(/-/g, " ")}
                        </CardDescription>
                    </div>
                    <StatusBadge
                        label={transaction.current_state_display}
                        tone={tone}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                        {providerAvatarUrl ? (
                            <AvatarImage src={providerAvatarUrl} alt={transaction.provider.name} />
                        ) : null}
                        <AvatarFallback>
                            {transaction.provider.name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                            {transaction.provider.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Venue host</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
                {earliest ? (
                    <div className="space-y-2">
                        <BookingSlotSummary booking={earliest} />
                        {extraSlots > 0 ? (
                            <p className="pl-7 text-xs text-muted-foreground">
                                + {extraSlots} more {extraSlots === 1 ? "slot" : "slots"}
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No slot details</p>
                )}

                <div className="flex items-center justify-between gap-3 border-t pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ReceiptIcon className="size-4 shrink-0" />
                        <span>
                            {formatMoney(
                                transaction.pay_in_total.amount,
                                transaction.pay_in_total.currency,
                            )}
                        </span>
                    </div>

                    {href ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                            {isPending ? "Complete payment" : "View details"}
                            <ChevronRightIcon className="size-4" />
                        </span>
                    ) : null}
                </div>

                {isPending ? (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                        <ClockIcon className="mt-0.5 size-3.5 shrink-0" />
                        <span>Payment required to keep your reservation.</span>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );

    if (!href) {
        return card;
    }

    return (
        <Link href={href} className="block">
            {card}
        </Link>
    );
}

const BookingsList = ({
    transactions,
    emptyMessage = "No bookings yet.",
    className,
}: BookingsListProps) => {
    if (transactions.length === 0) {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-16 text-center",
                    className,
                )}
            >
                <CalendarIcon className="mb-3 size-10 text-muted-foreground" />
                <p className="text-sm font-medium">{emptyMessage}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Book a court from a listing to see it here.
                </p>
                <Button asChild className="mt-6" variant="outline">
                    <Link href="/listings">Browse listings</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {transactions.map((transaction) => (
                <BookingCard key={transaction.id} transaction={transaction} />
            ))}
        </div>
    );
};

export default BookingsList;
