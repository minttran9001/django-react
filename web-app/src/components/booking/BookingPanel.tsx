"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { CourtSummary } from "@/features/court-centers/types";
import { BookingFormValues } from "@/features/booking/schemas/bookingSchema";
import { serializeLineItemSlots } from "@/lib/api/lineItem";
import {
    CHECKOUT_PATH,
    saveCheckoutDraft,
} from "@/lib/checkout/draft";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import BookingForm from "./BookingForm";

type BookingPanelProps = {
    courtCenterId: string;
    courts: CourtSummary[];
    className?: string;
    courtCenterStatus?: string;
    isOwnListing?: boolean;
};

const BookingPanel = ({ courtCenterId, courts, className, courtCenterStatus, isOwnListing }: BookingPanelProps) => {
    const router = useRouter();

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

    const onSubmit = (data: BookingFormValues) => {
        saveCheckoutDraft({
            court_center_id: courtCenterId,
            court_id: Number(data.court_id),
            slots: serializeLineItemSlots(data.slots),
        });
        router.push(CHECKOUT_PATH);
    };

    return (
        <Card className={cn("h-fit lg:sticky lg:top-6", className)}>
            <CardHeader>
                <CardTitle>Book a court</CardTitle>
                <CardDescription>
                    Pick a date, court, and time slot to reserve.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                <BookingForm courtCenterId={courtCenterId} onSubmit={onSubmit} />
            </CardContent>
        </Card>
    );
};

export default BookingPanel;
