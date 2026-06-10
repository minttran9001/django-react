"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fieldClassName } from "@/components/court-centers/wizard/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DAY_OPTIONS } from "@/features/court-centers/utils/wizard";
import {
  buildSlotFromMinuteRange,
  CALENDAR_START_HOUR,
  clientYToMinutes,
  DEFAULT_SLOT_DURATION_MINUTES,
  formatHourLabel,
  formatTimeRange,
  getBlockStyle,
  getCalendarHeight,
  getDayLabel,
  getHourLabels,
  getSlotResizeLimits,
  groupSchedulesByDay,
  HOUR_HEIGHT_PX,
  MIN_SLOT_DURATION_MINUTES,
  type ScheduleSlotValue,
  slotWouldOverlap,
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

type DragMode = "create" | "resize-top" | "resize-bottom";

type DragState = {
  mode: DragMode;
  dayOfWeek: number;
  slotIndex?: number;
  anchorMinutes: number;
  columnTop: number;
  moved: boolean;
};

export function WeeklyAvailabilityCalendar({
  schedules,
  onChange,
  disabled = false,
  idPrefix = "calendar",
}: WeeklyAvailabilityCalendarProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSlotEditPosition, setSelectedSlotEditPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<ScheduleSlotValue | null>(
    null,
  );
  const [activeDrag, setActiveDrag] = useState<{
    mode: DragMode;
    dayOfWeek: number;
    slotIndex?: number;
  } | null>(null);

  const selectedSlotRef = useRef<HTMLDivElement | null>(null);
  const selectedSlotEditModalRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragPreviewRef = useRef<ScheduleSlotValue | null>(null);
  const suppressClickRef = useRef(false);

  const assignSelectedSlotRef = useCallback((node: HTMLDivElement | null) => {
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

  const clearAllSlots = (dayOfWeek: number) => {
    const nextSchedules = schedules.filter(
      (slot) => slot.day_of_week !== dayOfWeek,
    );
    onChange(nextSchedules);
  };

  const setPreview = (preview: ScheduleSlotValue | null) => {
    dragPreviewRef.current = preview;
    setDragPreview(preview);
  };

  const handleDragMove = useCallback(
    (event: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || disabled) {
        return;
      }

      drag.moved = true;
      const currentMinutes = clientYToMinutes(event.clientY, drag.columnTop);

      if (drag.mode === "create") {
        const nextPreview = buildSlotFromMinuteRange(
          drag.dayOfWeek,
          drag.anchorMinutes,
          currentMinutes,
        );
        if (!slotWouldOverlap(schedules, nextPreview)) {
          setPreview(nextPreview);
        }
        return;
      }

      if (drag.slotIndex === undefined) {
        return;
      }

      const slot = schedules[drag.slotIndex];
      const { minStartMinutes, maxEndMinutes } = getSlotResizeLimits(
        schedules,
        drag.slotIndex,
      );
      const slotStart = timeToMinutes(slot.start_time);
      const slotEnd = timeToMinutes(slot.end_time);

      const nextPreview =
        drag.mode === "resize-top"
          ? buildSlotFromMinuteRange(
            slot.day_of_week,
            Math.min(
              Math.max(currentMinutes, minStartMinutes),
              slotEnd - MIN_SLOT_DURATION_MINUTES,
            ),
            slotEnd,
          )
          : buildSlotFromMinuteRange(
            slot.day_of_week,
            slotStart,
            Math.max(
              Math.min(currentMinutes, maxEndMinutes),
              slotStart + MIN_SLOT_DURATION_MINUTES,
            ),
          );

      if (
        !slotWouldOverlap(schedules, nextPreview, drag.slotIndex) &&
        timeToMinutes(nextPreview.end_time) >
        timeToMinutes(nextPreview.start_time)
      ) {
        setPreview(nextPreview);
      }
    },
    [disabled, schedules],
  );

  const finishDrag = useCallback(() => {
    document.removeEventListener("mousemove", handleDragMove);

    const drag = dragRef.current;
    dragRef.current = null;
    const preview = dragPreviewRef.current;
    dragPreviewRef.current = null;
    setDragPreview(null);
    setActiveDrag(null);

    if (!drag || disabled) {
      return;
    }

    if (drag.moved) {
      suppressClickRef.current = true;
    }

    if (drag.mode === "create") {
      const nextSlot =
        drag.moved && preview
          ? preview
          : buildSlotFromMinuteRange(
            drag.dayOfWeek,
            drag.anchorMinutes,
            drag.anchorMinutes + DEFAULT_SLOT_DURATION_MINUTES,
          );

      if (!slotWouldOverlap(schedules, nextSlot)) {
        const nextSchedules = [...schedules, nextSlot];
        onChange(nextSchedules);
        setSelectedIndex(nextSchedules.length - 1);
      }
      return;
    }

    if (drag.slotIndex === undefined || !preview) {
      return;
    }

    if (
      !slotWouldOverlap(schedules, preview, drag.slotIndex) &&
      timeToMinutes(preview.end_time) > timeToMinutes(preview.start_time)
    ) {
      onChange(
        schedules.map((schedule, index) =>
          index === drag.slotIndex
            ? {
              ...schedule,
              start_time: preview.start_time,
              end_time: preview.end_time,
            }
            : schedule,
        ),
      );
    }
  }, [disabled, handleDragMove, onChange, schedules]);

  const startDragListeners = useCallback(() => {
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", finishDrag, { once: true });
  }, [finishDrag, handleDragMove]);

  const handleCreateMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    dayOfWeek: number,
  ) => {
    if (disabled || event.button !== 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      mode: "create",
      dayOfWeek,
      anchorMinutes: clientYToMinutes(event.clientY, rect.top),
      columnTop: rect.top,
      moved: false,
    };
    setActiveDrag({ mode: "create", dayOfWeek });

    startDragListeners();
  };

  const handleResizeMouseDown = (
    event: React.MouseEvent<HTMLElement>,
    slotIndex: number,
    mode: "resize-top" | "resize-bottom",
  ) => {
    if (disabled || event.button !== 0) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const slot = schedules[slotIndex];
    const column = event.currentTarget.closest("[data-day-column]");
    if (!column) {
      return;
    }

    const rect = column.getBoundingClientRect();
    dragRef.current = {
      mode,
      dayOfWeek: slot.day_of_week,
      slotIndex,
      anchorMinutes:
        mode === "resize-top"
          ? timeToMinutes(slot.start_time)
          : timeToMinutes(slot.end_time),
      columnTop: rect.top,
      moved: false,
    };
    setActiveDrag({ mode, dayOfWeek: slot.day_of_week, slotIndex });
    setSelectedIndex(slotIndex);
    setPreview(slot);

    startDragListeners();
  };

  const handleSlotMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    slotIndex: number,
    slotHeight: number,
  ) => {
    if (disabled || event.button !== 0) {
      return;
    }

    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const edgeSize = Math.max(14, slotHeight * 0.25);

    setSelectedIndex(slotIndex);

    if (offsetY <= edgeSize) {
      handleResizeMouseDown(event, slotIndex, "resize-top");
      return;
    }

    if (offsetY >= rect.height - edgeSize) {
      handleResizeMouseDown(event, slotIndex, "resize-bottom");
    }
  };

  const handleSlotClick = (
    event: React.MouseEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    event.stopPropagation();
    setSelectedIndex(slotIndex);
  };

  useEffect(() => {
    const updatePosition = () => {
      const node = selectedSlotRef.current;
      if (!node || selectedIndex === null) {
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
  }, [selectedIndex, schedules]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (activeDrag) {
        return;
      }
      if (
        selectedSlotEditPosition &&
        !selectedSlotEditModalRef.current?.contains(event.target as Node) &&
        !selectedSlotRef.current?.contains(event.target as Node)
      ) {
        setSelectedSlotEditPosition(null);
        setSelectedIndex(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeDrag, selectedSlotEditPosition]);

  const renderSlotBlock = (
    slot: ScheduleSlotValue & { index?: number },
    options: {
      isSelected: boolean;
      isPreview?: boolean;
      slotIndex?: number;
    },
  ) => {
    const { top, height } = getBlockStyle(slot.start_time, slot.end_time);

    return (
      <div
        key={
          options.isPreview
            ? `preview-${slot.day_of_week}-${slot.start_time}-${slot.end_time}`
            : `${slot.index}-${slot.start_time}-${slot.end_time}`
        }
        ref={
          options.isSelected && !options.isPreview
            ? assignSelectedSlotRef
            : undefined
        }
        role="button"
        tabIndex={disabled || options.isPreview ? -1 : 0}
        onMouseDown={(event) => {
          if (options.isPreview || options.slotIndex === undefined) {
            return;
          }
          handleSlotMouseDown(event, options.slotIndex, height);
        }}
        onClick={(event) => {
          if (options.slotIndex !== undefined) {
            handleSlotClick(event, options.slotIndex);
          }
        }}
        onKeyDown={(event) => {
          if (
            options.slotIndex !== undefined &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            setSelectedIndex(options.slotIndex);
          }
        }}
        className={cn(
          "absolute inset-x-1 z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-xs font-medium shadow-sm transition-colors select-none flex flex-col items-center justify-center",
          options.isPreview
            ? "pointer-events-none z-20 border-dashed border-primary bg-primary/20 text-primary"
            : options.isSelected
              ? "cursor-grab border-primary bg-primary text-primary-foreground active:cursor-grabbing"
              : "cursor-pointer border-primary/30 bg-primary/15 text-primary hover:bg-primary/25",
          !options.isPreview && !disabled && "hover:ring-2 hover:ring-primary/30",
        )}
        style={{ top, height }}
      >
        {!options.isPreview ? (
          <>
            <div
              aria-hidden
              className={cn(
                "absolute inset-x-0 top-0 z-20 flex h-4 items-center justify-center",
                options.isSelected
                  ? "cursor-ns-resize bg-primary-foreground/15"
                  : "cursor-ns-resize",
              )}
            >
              <div className="h-[2px] w-8 rounded-full bg-current opacity-50" />
            </div>
            <div
              aria-hidden
              className={cn(
                "absolute inset-x-0 bottom-0 z-20 flex h-4 items-center justify-center",
                options.isSelected
                  ? "cursor-ns-resize bg-primary-foreground/15"
                  : "cursor-ns-resize",
              )}
            >
              <div className="h-[2px] w-8 rounded-full bg-current opacity-50" />
            </div>
          </>
        ) : null}
        <span className="relative z-10 block truncate pt-3 pb-3">
          {formatTimeRange(slot.start_time, slot.end_time)}
        </span>
      </div>
    );
  };

  const addAllWeekSlots = () => {
    const nextSchedules = [];
    for (const day of DAY_OPTIONS) {
      nextSchedules.push(buildSlotFromMinuteRange(day.value, 5 * 60, 23 * 60));
    }
    onChange(nextSchedules);
  };

  const clearAllWeekSlots = () => {
    onChange([]);
  };


  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click or drag on a day to add a slot. Drag the top or bottom edge of any
        slot to adjust its time.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addAllWeekSlots()}>
          Add all week slots from 5am to 11pm
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clearAllWeekSlots}>
          Clear all slots
        </Button>
      </div>
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
                <p className="text-sm font-semibold">
                  {getDayLabel(day.value, true)}
                </p>
                <p className="text-xs text-muted-foreground">{day.label}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={disabled}
                  onClick={() => clearAllSlots(day.value)}
                >
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
                data-day-column
                className="relative border-r last:border-r-0"
                style={{ height: calendarHeight }}
              >
                {hourLabels.slice(1).map((hour) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute inset-x-0 border-t border-border/40"
                    style={{ top: (hour - CALENDAR_START_HOUR) * HOUR_HEIGHT_PX }}
                  />
                ))}

                <div
                  className={cn(
                    "absolute inset-0 z-0",
                    disabled ? "cursor-not-allowed" : "cursor-crosshair",
                  )}
                  onMouseDown={(event) =>
                    handleCreateMouseDown(event, day.value)
                  }
                />

                {groupedSchedules[day.value].map((slot) => {
                  const isSelected = selectedIndex === slot.index;
                  const isBeingResized =
                    activeDrag?.slotIndex === slot.index &&
                    activeDrag.mode !== "create";

                  if (isBeingResized) {
                    return null;
                  }

                  return renderSlotBlock(slot, {
                    isSelected,
                    slotIndex: slot.index,
                  });
                })}

                {dragPreview?.day_of_week === day.value &&
                  activeDrag?.mode === "create"
                  ? renderSlotBlock(dragPreview, {
                    isSelected: false,
                    isPreview: true,
                  })
                  : null}

                {dragPreview?.day_of_week === day.value &&
                  activeDrag?.slotIndex !== undefined &&
                  activeDrag.mode !== "create"
                  ? renderSlotBlock(dragPreview, {
                    isSelected: true,
                    isPreview: true,
                    slotIndex: activeDrag.slotIndex,
                  })
                  : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedSlot && selectedIndex !== null ? (
        <div
          ref={selectedSlotEditModalRef}
          style={{
            top: selectedSlotEditPosition?.top,
            left: `calc(${selectedSlotEditPosition?.left}px + 120px)`,
          }}
          className="fixed z-50 rounded-xl border border-border/60 bg-white p-4 shadow-2xl"
        >
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
                onChange={(event) => {
                  const startMinutes = timeToMinutes(event.target.value);
                  if (startMinutes < 5 * 60 || startMinutes > 23 * 60) {
                    return;
                  }
                  updateSlot(selectedIndex, {
                    start_time: event.target.value,
                  })
                }
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
      ) : null}
    </div>
  );
}
