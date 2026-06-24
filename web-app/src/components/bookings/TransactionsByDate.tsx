"use client";

import { format } from "date-fns";
import { X } from "lucide-react";

import BookingsList from "@/components/bookings/BookingsList";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/lib/types/transaction";
import { cn } from "@/lib/utils";

export const TRANSACTIONS_BY_DATE_PANEL_WIDTH = "20rem";
export const TRANSACTIONS_BY_DATE_TRANSITION_MS = 300;

type TransactionsByDateProps = {
    className?: string;
    transactions: Transaction[];
    date: Date;
    show: boolean;
    onClose: () => void;
};

const TransactionsByDate = ({
    className,
    transactions,
    date,
    show,
    onClose,
}: TransactionsByDateProps) => {
    return (
        <aside
            aria-hidden={!show}
            inert={!show ? true : undefined}
            className={cn(
                "flex h-full flex-col gap-4 p-4",
                "transition-opacity ease-in-out",
                show ? "opacity-100" : "pointer-events-none opacity-0",
                className,
            )}
            style={{
                width: TRANSACTIONS_BY_DATE_PANEL_WIDTH,
                transitionDuration: `${TRANSACTIONS_BY_DATE_TRANSITION_MS}ms`,
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Bookings on
                    </p>
                    <h2 className="text-lg font-semibold">{format(date, "EEEE, MMM d")}</h2>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    aria-label="Close panel"
                >
                    <X className="size-4" />
                </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto max-h-[calc(100vh-20rem)]">
                <BookingsList
                    className="overflow-scroll"
                    transactions={transactions}
                    emptyMessage="No bookings on this day."
                />
            </div>
        </aside>
    );
};

export default TransactionsByDate;
