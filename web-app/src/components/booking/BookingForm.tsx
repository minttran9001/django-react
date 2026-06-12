import { cn } from "@/lib/utils";
import { Label } from "../ui/label";
import { Calendar } from "../ui/calendar";
import { SelectCore } from "../ui/select";
import { Button } from "../ui/button";
import { format } from "date-fns";
import { useMemo } from "react";
import { CourtSummary } from "@/features/court-centers/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookingFormValues, bookingSchema } from "@/features/booking/schemas/bookingSchema";
import { getAvailableSlots, isSlotInPast, TimeSlot } from "@/features/booking/utils/slots";


function formatPrice(amount: string, currency: string): string {
    const value = Number(amount);
    if (Number.isNaN(value)) {
        return "";
    }

    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatSlotLabel(slot: TimeSlot): string {
    const toDisplayTime = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return format(date, "h:mm a");
    };

    return `${toDisplayTime(slot.start)} – ${toDisplayTime(slot.end)}`;
}

function slotKey(slot: TimeSlot): string {
    return `${slot.start}-${slot.end}`;
}

type BookingFormProps = {
    className?: string;
    courts: CourtSummary[];
    onSubmit: (data: BookingFormValues) => void;
}

const BookingForm = ({ className, courts, onSubmit }: BookingFormProps) => {
    const today = useMemo(() => {
        const value = new Date();
        value.setHours(0, 0, 0, 0);
        return value;
    }, []);

    const {
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            date: new Date(),
            court_id: courts[0] ? String(courts[0].id) : "",
            slot: null,
        },
    });

    const date = watch("date");
    const courtId = watch("court_id");
    const selectedSlot = watch("slot");

    const selectedCourt = useMemo(
        () => courts.find((court) => String(court.id) === courtId),
        [courts, courtId],
    );

    const availableSlots = useMemo(() => {
        if (!date || !selectedCourt) {
            return [];
        }

        return getAvailableSlots(selectedCourt.schedules, date).filter(
            (slot) => !isSlotInPast(date, slot.start),
        );
    }, [date, selectedCourt]);

    const courtItems = useMemo(
        () =>
            courts.map((court) => ({
                value: String(court.id),
                label: `${court.title} (${court.sport.name})`,
            })),
        [courts],
    );

    const canBook = date && selectedCourt && selectedSlot && courts.length > 0;

    const handleDateSelect = (nextDate: Date | undefined) => {
        if (!nextDate) {
            return;
        }

        setValue("date", nextDate, { shouldValidate: true });
        setValue("slot", null, { shouldValidate: true });
    };

    const handleCourtChange = (value: string) => {
        setValue("court_id", value, { shouldValidate: true });
        setValue("slot", null, { shouldValidate: true });
    };

    const handleSlotSelect = (slot: TimeSlot) => {
        setValue("slot", slot, { shouldValidate: true });
    };

    return (
        <form
            className={cn('space-y-4', className)}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
        >
            <div className="space-y-2">
                <Label>Date</Label>
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    className="mx-auto w-full rounded-lg border p-0"
                    disabled={{ before: today }}
                />
                {errors.date ? (
                    <p className="text-sm text-destructive">{errors.date.message}</p>
                ) : null}
            </div>

            <div className="space-y-2">
                <Label htmlFor="booking-court">Court</Label>
                <SelectCore
                    items={courtItems}
                    value={courtId}
                    onChange={handleCourtChange}
                    placeholder="Select a court"
                />
                {errors.court_id ? (
                    <p className="text-sm text-destructive">
                        {errors.court_id.message}
                    </p>
                ) : null}
            </div>

            <div className="space-y-2">
                <Label>Time</Label>
                {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                        {availableSlots.map((slot) => {
                            const isSelected =
                                selectedSlot !== null &&
                                slotKey(selectedSlot) === slotKey(slot);

                            return (
                                <Button
                                    key={slotKey(slot)}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    className="h-auto py-2 text-xs"
                                    onClick={() => handleSlotSelect(slot)}
                                >
                                    {formatSlotLabel(slot)}
                                </Button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                        {date
                            ? "No available times on this day."
                            : "Select a date to see available times."}
                    </p>
                )}
                {errors.slot ? (
                    <p className="text-sm text-destructive">{errors.slot.message}</p>
                ) : null}
            </div>

            {canBook && selectedCourt ? (
                <div className="rounded-lg bg-muted/60 px-3 py-3 text-sm">
                    <p className="font-medium">{selectedCourt.title}</p>
                    <p className="text-muted-foreground">
                        {format(date, "EEEE, MMMM d")} ·{" "}
                        {formatSlotLabel(selectedSlot!)}
                    </p>
                    {selectedCourt.price_per_hour.amount ? (
                        <p className="mt-1 font-medium">
                            {formatPrice(
                                selectedCourt.price_per_hour.amount,
                                selectedCourt.price_per_hour.currency,
                            )}
                            <span className="font-normal text-muted-foreground">
                                {" "}
                                / hour
                            </span>
                        </p>
                    ) : null}
                </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting} isLoading={isSubmitting}>
                Book Court
            </Button>
        </form>
    )
}

export default BookingForm;