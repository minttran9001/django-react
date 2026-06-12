"use client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { CourtSummary } from "@/features/court-centers/types";
import { cn } from "@/lib/utils";
import BookingForm from "./BookingForm";

type BookingPanelProps = {
    courts: CourtSummary[];
    className?: string;
    courtCenterStatus?: string;
    isOwnListing?: boolean;
};

const BookingPanel = ({ courts, className, courtCenterStatus, isOwnListing }: BookingPanelProps) => {

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
            </Card >
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

    return (

        <Card className={cn("h-fit lg:sticky lg:top-6", className)}>
            <CardHeader>
                <CardTitle>Book a court</CardTitle>
                <CardDescription>
                    Pick a date, court, and time slot to reserve.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                <BookingForm courts={courts} onSubmit={() => { }} />
            </CardContent>
        </Card>
    );
};

export default BookingPanel;
