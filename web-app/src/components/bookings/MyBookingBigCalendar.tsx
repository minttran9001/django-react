"use client";

import dynamic from "next/dynamic";
import { format } from "date-fns";
import { Calendar, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { SlotInfo } from "react-big-calendar";

import { getDayKey, parseFlexibleDate } from "@/lib/dates";
import type { Transaction } from "@/lib/types/transaction";
import { cn } from "@/lib/utils";

import TransactionsByDate, {
    TRANSACTIONS_BY_DATE_PANEL_WIDTH,
    TRANSACTIONS_BY_DATE_TRANSITION_MS,
} from "./TransactionsByDate";
import { Button } from "../ui/button";
import Link from "next/link";

const BookingEventsCalendar = dynamic(
    () => import("./BookingEventsCalendar"),
    {
        ssr: false,
        loading: () => (
            <div className="flex min-h-[640px] items-center justify-center rounded-xl border bg-muted/20">
                <p className="text-sm text-muted-foreground">Loading calendar…</p>
            </div>
        ),
    },
);

type MyBookingBigCalendarProps = {
    transactions: Transaction[];
    isLoading?: boolean;
};

const MyBookingBigCalendar = ({
    transactions,
    isLoading = false,
}: MyBookingBigCalendarProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const selectedDate = useMemo(() => {
        const param = searchParams.get("date");
        return param ? parseFlexibleDate(param) : undefined;
    }, [searchParams]);

    const [panelExpanded, setPanelExpanded] = useState(() =>
        Boolean(searchParams.get("date")),
    );

    const transactionsForDate = useMemo(() => {
        if (!selectedDate) {
            return [];
        }

        const dayKey = getDayKey(selectedDate);
        return transactions.filter((transaction) =>
            transaction.bookings.some((booking) => booking.date === dayKey),
        );
    }, [transactions, selectedDate]);

    const onSelectSlot = (slotInfo: SlotInfo) => {
        const searchQuery = new URLSearchParams(searchParams.toString());
        searchQuery.set("date", format(slotInfo.start, "yyyy-MM-dd"));

        if (!selectedDate) {
            setPanelExpanded(false);
            router.replace(`/bookings/calendar?${searchQuery.toString()}`);
            requestAnimationFrame(() => setPanelExpanded(true));
            return;
        }

        setPanelExpanded(true);
        router.replace(`/bookings/calendar?${searchQuery.toString()}`);
    };

    const onClose = () => {
        setPanelExpanded(false);
        window.setTimeout(() => {
            router.replace("/bookings/calendar");
        }, TRANSACTIONS_BY_DATE_TRANSITION_MS);
    };

    const isPanelVisible = Boolean(selectedDate) && panelExpanded;

    if (isLoading && transactions.length === 0) {
        return (
            <div className="flex min-h-[640px] items-center justify-center rounded-xl border bg-muted/20">
                <Loader2 className="size-10 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="flex justify-between items-center">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold">My calendar</h1>
                    <p className="text-sm text-muted-foreground">
                        Click a day to see bookings, or click an event for details.
                    </p>
                </div>


                <Link href="/bookings?tab=upcoming">
                    <Button variant="outline" size="sm">
                        <Calendar className="size-4" />
                        Back to list
                    </Button>
                </Link>

            </div>
            <div className="flex min-h-[640px] overflow-hidden gap-4">
                <BookingEventsCalendar
                    className="min-w-0 flex-1"
                    transactions={transactions}
                    initialDate={selectedDate}
                    onSelectSlot={onSelectSlot}
                />

                <div
                    className={cn(
                        "shrink-0 overflow-hidden border-l bg-card ease-in-out",
                        isPanelVisible ? "opacity-100" : "opacity-0",
                    )}
                    style={{
                        width:
                            selectedDate && panelExpanded
                                ? TRANSACTIONS_BY_DATE_PANEL_WIDTH
                                : 0,
                        transitionProperty: "width, opacity",
                        transitionDuration: `${TRANSACTIONS_BY_DATE_TRANSITION_MS}ms`,
                    }}
                >
                    {selectedDate ? (
                        <TransactionsByDate
                            transactions={transactionsForDate}
                            date={selectedDate}
                            show={isPanelVisible}
                            onClose={onClose}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default MyBookingBigCalendar;
