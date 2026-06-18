"use client"

import { useGetMyTransactionsQuery } from "@/lib/api/transactionApi";
import VerticalTabNavigation from "../ui/VertialTabNavigation";
import { CalendarIcon, CheckCircleIcon, HistoryIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import BookingsList from "./BookingsList";
import { ETransactionState } from "@/lib/types/transaction";

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

const MyBookingsView = () => {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") || "upcoming";
    const states = TAB_MAP_TO_STATES[activeTab as keyof typeof TAB_MAP_TO_STATES];
    const { data: transactions = [], isLoading, isFetching } = useGetMyTransactionsQuery({ states });
    const { data: pendingPaymentsTransactions = [] } = useGetMyTransactionsQuery({ states: [ETransactionState.PENDING_PAYMENT] });
    const isInitialLoading = isLoading || isFetching;
    return <div className="container mx-auto flex gap-4">
        <VerticalTabNavigation
            className="basis-2/5"
            tabs={[
                { label: "Upcoming", value: "upcoming", icon: <CalendarIcon color="blue" size={16} />, href: "/bookings?tab=upcoming" },
                { label: "Completed", value: "completed", icon: <CheckCircleIcon color="green" size={16} />, href: "/bookings?tab=completed" },
                { label: "Past", value: "past", icon: <HistoryIcon color="red" size={16} />, href: "/bookings?tab=past" },
            ]}
            label="Bookings"
            activeTab={activeTab}
        />

        <div className="basis-3/5">
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
    </div>
};

export default MyBookingsView;