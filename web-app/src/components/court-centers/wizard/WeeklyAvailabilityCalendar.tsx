"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fieldClassName } from "@/components/court-centers/wizard/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DAY_OPTIONS } from "@/features/court-centers/utils/wizard";
import {
  CALENDAR_START_HOUR,
  createSlotFromClick,
  formatHourLabel,
  formatTimeRange,
  getBlockStyle,
  getCalendarHeight,
  getDayLabel,
  getHourLabels,
  groupSchedulesByDay,
  HOUR_HEIGHT_PX,
  type ScheduleSlotValue,
  timeToMinutes,
} from "@/features/court-centers/utils/scheduleCalendar";
import { normalizeTime } from "@/features/court-centers/utils/wizard";
import { cn } from "@/lib/utils";

type WeeklyAvailabilityCalendarProps = {
  schedules: ScheduleSlotValue[];
  onChange: (schedules: ScheduleSlotValue[]) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function WeeklyAvailabilityCalendar({
  schedules,
  onChange,
  disabled = false,
  idPrefix = "calendar",
}: WeeklyAvailabilityCalendarProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    null
  );

  const [selectedSlotEditPosition, setSelectedSlotEditPosition] = useState<{ top: number, left: number } | null>(null);
  const selectedSlotRef = useRef<HTMLButtonElement | null>(null);
  const selectedSlotEditModalRef = useRef<HTMLDivElement | null>(null);


  const assignSelectedSlotRef = useCallback((node: HTMLButtonElement | null) => {
    selectedSlotRef.current = node;
    if (node) {
      const rect = node.getBoundingClientRect();
      setSelectedSlotEditPosition({ top: rect.top, left: rect.left });
    }
  }, []);

  const groupedSchedules = useMemo(
    () => groupSchedulesByDay(schedules),
    [schedules],
  );
  const hourLabels = useMemo(() => getHourLabels(), []);
  const calendarHeight = getCalendarHeight();
  const selectedSlot =
    selectedIndex !== null ? schedules[selectedIndex] : null;

  const updateSlot = (index: number, patch: Partial<ScheduleSlotValue>) => {
    onChange(
      schedules.map((schedule, scheduleIndex) =>
        scheduleIndex === index ? { ...schedule, ...patch } : schedule,
      ),
    );
  };

  const removeSlot = (index: number) => {
    const nextSchedules = schedules.filter(
      (_, scheduleIndex) => scheduleIndex !== index,
    );
    onChange(nextSchedules);
    setSelectedIndex(null);
  };

  const newSlotIsGotOverlapping = (slot: ScheduleSlotValue) => {
    const isOverlapping = schedules.some((schedule) => {
      const isSameDay = schedule.day_of_week === slot.day_of_week;
      const startTimeAlreadyInUse = timeToMinutes(schedule.start_time) < timeToMinutes(slot.start_time) && timeToMinutes(schedule.end_time) > timeToMinutes(slot.start_time);
      const endTimeAlreadyInUse = timeToMinutes(schedule.start_time) < timeToMinutes(slot.end_time) && timeToMinutes(schedule.end_time) > timeToMinutes(slot.end_time);
      return isSameDay && (startTimeAlreadyInUse || endTimeAlreadyInUse);
    });
    return isOverlapping;
  };


  const addSlot = (dayOfWeek: number, offsetY?: number) => {
    const nextSlot =
      offsetY !== undefined
        ? createSlotFromClick(dayOfWeek, offsetY)
        : {
          day_of_week: dayOfWeek,
          start_time: "08:00",
          end_time: "22:00",
        };
    if (newSlotIsGotOverlapping(nextSlot)) {
      return;
    }
    const nextSchedules = [...schedules, nextSlot];
    onChange(nextSchedules);
    setSelectedIndex(nextSchedules.length - 1);
  };

  const clearAllSlots = (dayOfWeek: number) => {
    const nextSchedules = schedules.filter((slot) => slot.day_of_week !== dayOfWeek);
    onChange(nextSchedules);
  };


  useEffect(() => {
    const updatePosition = () => {
      const node = selectedSlotRef.current;
      if (!node || !selectedIndex) {
        return;
      }
      const rect = node.getBoundingClientRect();
      setSelectedSlotEditPosition({ top: rect.top, left: rect.left });
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [selectedIndex]);

  //on outside click, close the selected slot edit modal
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (selectedSlotEditPosition && !selectedSlotEditModalRef.current?.contains(event.target as Node)) {
        setSelectedSlotEditPosition(null);
        setSelectedIndex(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [selectedSlotEditPosition]);

  return (
    <div className="space-y-4">

      <p className="text-sm text-muted-foreground">
        Click empty space on a day to add a slot
      </p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b bg-muted/40">
            <div className="border-r px-3 py-3 text-xs font-medium text-muted-foreground">
              Time
            </div>
            {DAY_OPTIONS.map((day) => (
              <div
                key={day.value}
                className="border-r px-2 py-3 text-center last:border-r-0"
              >
                <p className="text-sm font-semibold">{getDayLabel(day.value, true)}</p>
                <p className="text-xs text-muted-foreground">{day.label}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => clearAllSlots(day.value)}>
                  <Trash2 className="size-4" />
                  Clear
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
            <div
              className="relative border-r bg-muted/20"
              style={{ height: calendarHeight }}
            >
              {hourLabels.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/60 px-2 text-[11px] text-muted-foreground"
                  style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT_PX }}
                >
                  <span className="-mt-2 inline-block bg-card px-1">
                    {formatHourLabel(hour)}
                  </span>
                </div>
              ))}
            </div>

            {DAY_OPTIONS.map((day) => (
              <div
                key={day.value}
                className="relative border-r last:border-r-0"
                style={{ height: calendarHeight }}
              >
                {hourLabels.slice(1).map((hour) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute inset-x-0 border-t border-border/40"
                    style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT_PX }}
                  >
                  </div>
                ))}

                {hourLabels.map((hour) => (
                  <div
                    key={`${day.value}-${hour}`}
                    id={`${day.value}-${hour}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      const firstLabel = document.getElementById(`${day.value}-${CALENDAR_START_HOUR}`);
                      if (firstLabel) {
                        const rect = firstLabel.getBoundingClientRect();
                        addSlot(day.value, event.clientY - rect.top);
                      }
                    }}
                    className="bg-amber absolute inset-x-0"
                    style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT_PX }}
                  >
                    <div className="bg-gray-100 hover:bg-gray-200 transition-colors" style={{ height: HOUR_HEIGHT_PX / 2 }}>
                      <p className="text-xs text-muted-foreground"></p>
                    </div>
                    <div className="bg-contain hover:bg-gray-200 transition-colors" style={{ height: HOUR_HEIGHT_PX / 2 }}>
                      <p className="text-xs text-muted-foreground"></p>
                    </div>
                  </div>
                ))}

                {groupedSchedules[day.value].map((slot) => {
                  const { top, height } = getBlockStyle(
                    slot.start_time,
                    slot.end_time,
                  );
                  const isSelected = selectedIndex === slot.index;

                  return (
                    <button
                      key={`${slot.index}-${slot.start_time}-${slot.end_time}`}
                      ref={isSelected ? assignSelectedSlotRef : undefined}
                      type="button"
                      disabled={disabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedIndex(slot.index);
                      }}
                      className={cn(
                        "absolute inset-x-1 z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-xs font-medium shadow-sm transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25",
                      )}
                      style={{ top, height }}
                    >
                      <span className="block truncate">
                        {formatTimeRange(slot.start_time, slot.end_time)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedSlot && selectedIndex !== null ? (
        <div ref={selectedSlotEditModalRef} style={{ top: selectedSlotEditPosition?.top, left: `calc(${selectedSlotEditPosition?.left}px + 120px)` }} className="fixed rounded-xl border shadow-2xl border-border/60 bg-white z-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Edit time slot</p>
              <p className="text-xs text-muted-foreground">
                {getDayLabel(selectedSlot.day_of_week)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => removeSlot(selectedIndex)}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-slot-start`}>Start</Label>
              <input
                id={`${idPrefix}-slot-start`}
                type="time"
                className={fieldClassName}
                disabled={disabled}
                value={normalizeTime(selectedSlot.start_time)}
                onChange={(event) =>
                  updateSlot(selectedIndex, {
                    start_time: event.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-slot-end`}>End</Label>
              <input
                id={`${idPrefix}-slot-end`}
                type="time"
                className={fieldClassName}
                disabled={disabled}
                value={normalizeTime(selectedSlot.end_time)}
                onChange={(event) =>
                  updateSlot(selectedIndex, {
                    end_time: event.target.value,
                  })
                }
              />
            </div>
          </div>

          {timeToMinutes(selectedSlot.end_time) <=
            timeToMinutes(selectedSlot.start_time) ? (
            <p className="mt-3 text-sm text-destructive">
              End time must be after start time.
            </p>
          ) : null}
        </div>
      ) : <></>}
    </div>
  );
}
