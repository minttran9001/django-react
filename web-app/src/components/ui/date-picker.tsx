"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

type DatePickerProps = {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    placeholder?: string
    className?: string
}

const DatePicker = ({ date, setDate, placeholder = "Pick a date", className }: DatePickerProps) => {
    return (
        <Popover>
            <PopoverTrigger
                asChild
            >
                <Button
                    variant="outline"
                    data-empty={!date}
                    className={cn("justify-start text-left font-normal data-[empty=true]:text-muted-foreground w-full", className)}
                >
                    <CalendarIcon />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} />
            </PopoverContent>
        </Popover>
    )
}

export default DatePicker;