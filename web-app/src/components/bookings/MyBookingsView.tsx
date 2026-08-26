"use client"

import { useGetMyTransactionCountsQuery } from "@/lib/api/transactionApi";
import { useMyTransactionsQuery } from "@/lib/api/transactionQueries";
import VerticalTabNavigation from "../ui/VertialTabNavigation";
import { Calendar, CalendarIcon, CheckCircleIcon, HistoryIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import BookingsList from "./BookingsList";
import { ETransactionState, MyTransactionCountsResponse } from "@/lib/types/transaction";
import isEmpty from "lodash/isEmpty";
import { Button } from "../ui/button";
import MyBookingBigCalendar from "./MyBookingBigCalendar";
import Link from "next/link";

const LoadingSkeleton = () => {
    const cards = Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
            <div className="h-64 w-full bg-gray-200 rounded-lg" />
            <div className="h-12 w-full bg-gray-200 rounded-full" />
            <div className="h-12 w-full bg-gray-200 rounded-full" />
        </div>
    ))
    return <div className="space-y-4">{cards}</div>
}

const TAB_MAP_TO_STATES = {
    upcoming: [ETransactionState.CONFIRMED],
    completed: [ETransactionState.COMPLETED, ETransactionState.REVIEWED],
    past: [ETransactionState.CANCELLED, ETransactionState.PAYMENT_EXPIRED],
}

const CALENDAR_STATES = [
    ...Object.values(TAB_MAP_TO_STATES).flat(),
]

const getCount = (states: ETransactionState[], counts?: MyTransactionCountsResponse["states"]) => {
    if (isEmpty(counts)) return 0;
    return states.map(state => counts[state] ?? 0).reduce((a, b) => a + b, 0);
}

const MyBookingsView = () => {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const isBigCalendar = pathname.includes("/bookings/calendar");
    const activeTab = searchParams.get("tab") || "upcoming";
    const states = TAB_MAP_TO_STATES[activeTab as keyof typeof TAB_MAP_TO_STATES];
    const { data: transactions = [], isLoading, isFetching } = useMyTransactionsQuery({ states }, { skip: isBigCalendar });
    const {
        data: calendarTransactions = [],
        isLoading: isCalendarLoading,
    } = useMyTransactionsQuery(
        { states: CALENDAR_STATES },
        { skip: !isBigCalendar },
    );
    const { data: pendingPaymentsTransactions = [] } = useMyTransactionsQuery({ states: [ETransactionState.PENDING_PAYMENT] }, { skip: isBigCalendar });
    const { data: transactionCounts } = useGetMyTransactionCountsQuery({ states: Object.values(TAB_MAP_TO_STATES).flat() });
    const counts = transactionCounts?.states
    const isInitialLoading = isLoading || isFetching;
    const upcomingCount = getCount(TAB_MAP_TO_STATES.upcoming, counts);
    const completedCount = getCount(TAB_MAP_TO_STATES.completed, counts);
    const pastCount = getCount(TAB_MAP_TO_STATES.past, counts);
    return (<div className="container mx-auto flex flex-col">
        {isBigCalendar ? (
            <MyBookingBigCalendar
                transactions={calendarTransactions}
                isLoading={isCalendarLoading}
            />
        ) :
            <div className="flex flex-col gap-4">
                <Link
                    href="/bookings/calendar"
                    prefetch
                    className="self-end"
                >
                    <Button variant="outline" size="sm">
                        <Calendar className="size-4" />
                        Show my calendar
                    </Button>
                </Link><div className="flex">
                    <VerticalTabNavigation
                        className="basis-2/5"
                        tabs={[
                            { label: `Upcoming (${upcomingCount})`, value: "upcoming", icon: <CalendarIcon color="blue" size={16} />, href: "/bookings?tab=upcoming" },
                            { label: `Completed (${completedCount})`, value: "completed", icon: <CheckCircleIcon color="green" size={16} />, href: "/bookings?tab=completed" },
                            { label: `Past (${pastCount})`, value: "past", icon: <HistoryIcon color="red" size={16} />, href: "/bookings?tab=past" },
                        ]}
                        label="Bookings"
                        activeTab={activeTab}
                    />

                    <div className="flex-1">
                        {pendingPaymentsTransactions.length > 0 && <div className="bg-yellow-50 rounded-lg mb-4 p-4">
                            <p className="text-sm text-yellow-800 mb-4">You have {pendingPaymentsTransactions.length} pending payments. Please complete your payments to confirm your bookings.</p>
                            <BookingsList transactions={pendingPaymentsTransactions ?? []} emptyMessage="No pending payments." />
                        </div>}

                        <div className="bg-white p-4 rounded-lg">
                            <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
                            {isInitialLoading ? <LoadingSkeleton /> : <BookingsList transactions={transactions ?? []} emptyMessage="No bookings yet." />}
                        </div>
                        <div>
                        </div>
                    </div>
                </div></div>}
    </div>)
};

export default MyBookingsView;