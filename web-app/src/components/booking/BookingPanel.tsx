"use client";

import { useState } from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CourtSummary } from "@/features/court-centers/types";
import { BookingFormValues } from "@/features/booking/schemas/bookingSchema";
import { BookingSeriesFormValues } from "@/features/booking/schemas/bookingSeriesSchema";
import { expandSeriesToSlots } from "@/features/booking/utils/expandSeriesToSlots";
import { serializeLineItemSlots } from "@/lib/api/lineItem";
import {
    CHECKOUT_PATH,
    saveCheckoutDraft,
} from "@/lib/checkout/draft";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import BookingForm from "./BookingForm";
import BookingSeriesForm from "./BookingSeriesForm";

type BookingMode = "single" | "monthly";

type BookingPanelProps = {
    courtCenterId: string;
    courts: CourtSummary[];
    className?: string;
    courtCenterStatus?: string;
    isOwnListing?: boolean;
};

const BookingPanel = ({ courtCenterId, courts, className, courtCenterStatus, isOwnListing }: BookingPanelProps) => {
    const router = useRouter();
    const [bookingMode, setBookingMode] = useState<BookingMode>("single");

    if (courtCenterStatus !== "published") {
        return (
            <Card className={cn("h-fit lg:sticky lg:top-6", className)}>
                <CardHeader>
                    <CardTitle>Book a court</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        This venue is not published yet.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (isOwnListing) {
        return (
            <Card className={cn("h-fit lg:sticky lg:top-6", className)}>
                <CardHeader>
                    <CardTitle>Book a court</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        You cannot book your own venue.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (courts.length === 0) {
        return (
            <Card className={cn("h-fit lg:sticky lg:top-6", className)}>
                <CardHeader>
                    <CardTitle>Book a court</CardTitle>
                    <CardDescription>
                        No courts are available for booking at this venue yet.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const onSingleSubmit = (data: BookingFormValues) => {
        saveCheckoutDraft({
            courtCenterId,
            courtId: Number(data.courtId),
            slots: serializeLineItemSlots(data.slots),
        });
        router.push(CHECKOUT_PATH);
    };

    const onMonthlySubmit = (data: BookingSeriesFormValues) => {
        const expandedSlots = expandSeriesToSlots(
            data.recurrenceRules,
            data.timeSlots,
            data.startDate,
            data.endDate,
        );

        saveCheckoutDraft({
            courtCenterId,
            courtId: Number(data.courtId),
            slots: serializeLineItemSlots(expandedSlots),
        });
        router.push(CHECKOUT_PATH);
    };

    return (
        <Card className={cn("h-fit lg:sticky lg:top-6", className)}>
            <CardHeader>
                <CardTitle>Book a court</CardTitle>
                <CardDescription>
                    {bookingMode === "single"
                        ? "Pick a date, court, and time slot to reserve."
                        : "Set a monthly pattern, court, and time for recurring sessions."}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant={bookingMode === "single" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBookingMode("single")}
                    >
                        One-time
                    </Button>
                    <Button
                        type="button"
                        variant={bookingMode === "monthly" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBookingMode("monthly")}
                    >
                        Monthly
                    </Button>
                </div>

                {bookingMode === "single" ? (
                    <BookingForm courtCenterId={courtCenterId} onSubmit={onSingleSubmit} />
                ) : (
                    <BookingSeriesForm courtCenterId={courtCenterId} onSubmit={onMonthlySubmit} />
                )}
            </CardContent>
        </Card>
    );
};

export default BookingPanel;
