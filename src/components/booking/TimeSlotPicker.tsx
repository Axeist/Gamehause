import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { compareBookingSlotStart } from "@/utils/bookingSlotOrder";

const formatTimeLabel = (timeString: string) => {
  const [h, m] = timeString.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  status?: "available" | "booked" | "elapsed";
}

export type SelectedSlot = TimeSlot & {
  id: string;
  resourceId: string;
  date: string;
};

export function makeSlotId(
  resourceId: string,
  date: string,
  startTime: string,
  endTime: string
): string {
  return `${resourceId}-${date}-${startTime}-${endTime}`;
}

function stripToTimeSlot(s: SelectedSlot): TimeSlot {
  const { id: _id, resourceId: _r, date: _d, ...rest } = s;
  return rest;
}

function isSlotDisabled(slot: TimeSlot): boolean {
  return !slot.is_available || slot.status === "elapsed";
}

/** Longest contiguous run by time (each end matches next start). */
function longestContiguousSorted(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => compareBookingSlotStart(a.start_time, b.start_time));
  let best: TimeSlot[] = [];
  let cur: TimeSlot[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].end_time === sorted[i].start_time) {
      cur.push(sorted[i]);
    } else {
      if (cur.length > best.length) best = cur;
      cur = [sorted[i]];
    }
  }
  if (cur.length > best.length) best = cur;
  return best.length ? best : [sorted[0]];
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  /** Used in every slot id: `${resourceId}-${date}-${start}-${end}` */
  resourceId: string;
  /** yyyy-MM-dd */
  date: string;
  selectedSlot: TimeSlot | null;
  selectedSlotRange?: TimeSlot[];
  onSlotSelect: (slot: TimeSlot | null, range?: TimeSlot[]) => void;
  loading?: boolean;
  payAtVenueEnabled?: boolean;
  /** When 1, only one slot can be selected (toggle replaces). Default: unlimited. */
  maxSelections?: number;
  /** Light: spec colors. Dark: for PublicBooking on dark cards. */
  variant?: "light" | "dark";
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  resourceId,
  date,
  selectedSlot,
  selectedSlotRange = [],
  onSlotSelect,
  loading = false,
  payAtVenueEnabled = false,
  maxSelections = Number.POSITIVE_INFINITY,
  variant = "light",
}) => {
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const lastShiftIndexRef = useRef<number | null>(null);
  const dragActiveRef = useRef(false);
  const dragAnchorIndexRef = useRef<number | null>(null);

  const enrich = useCallback(
    (slot: TimeSlot): SelectedSlot => ({
      ...slot,
      resourceId,
      date,
      id: makeSlotId(resourceId, date, slot.start_time, slot.end_time),
    }),
    [resourceId, date]
  );

  const emitParent = useCallback(
    (next: SelectedSlot[]) => {
      if (next.length === 0) {
        onSlotSelect(null, []);
        return;
      }
      const sorted = [...next].sort((a, b) => compareBookingSlotStart(a.start_time, b.start_time));
      const plain = sorted.map(stripToTimeSlot);
      const range = longestContiguousSorted(plain);
      const first = range[0];
      if (!first) {
        onSlotSelect(null, []);
        return;
      }
      onSlotSelect(first, range);
    },
    [onSlotSelect]
  );

  const externalSyncKey = useMemo(() => {
    const s = selectedSlot
      ? `${selectedSlot.start_time}|${selectedSlot.end_time}`
      : "";
    const r = (selectedSlotRange ?? [])
      .map((x) => `${x.start_time}|${x.end_time}`)
      .join(";");
    return `${resourceId}|${date}|${s}|${r}`;
  }, [resourceId, date, selectedSlot, selectedSlotRange]);

  useEffect(() => {
    if (!resourceId || !date) {
      setSelectedSlots([]);
      return;
    }
    const fromRange =
      selectedSlotRange.length > 0 ? selectedSlotRange : selectedSlot ? [selectedSlot] : [];
    setSelectedSlots(fromRange.map((s) => enrich(s)));
  }, [externalSyncKey, enrich, resourceId, date]);

  const handleSlotClick = (
    slot: TimeSlot,
    index: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (isSlotDisabled(slot)) return;

    const slotId = makeSlotId(resourceId, date, slot.start_time, slot.end_time);

    if (e.shiftKey && lastShiftIndexRef.current !== null && maxSelections !== 1) {
      const from = Math.min(lastShiftIndexRef.current, index);
      const to = Math.max(lastShiftIndexRef.current, index);
      const slice = slots.slice(from, to + 1).filter((s) => !isSlotDisabled(s));
      const enriched = slice.map((s) => enrich(s));
      flushSync(() => {
        setSelectedSlots(enriched);
      });
      emitParent(enriched);
      return;
    }

    let next: SelectedSlot[] = [];
    flushSync(() => {
      setSelectedSlots((prev) => {
        const exists = prev.find((s) => s.id === slotId);

        if (exists) {
          next = prev.filter((s) => s.id !== slotId);
          return next;
        }

        if (maxSelections === 1) {
          next = [enrich(slot)];
          return next;
        }

        if (prev.length >= maxSelections) {
          next = prev;
          return prev;
        }

        next = [...prev, enrich(slot)];
        return next;
      });
    });
    emitParent(next);

    lastShiftIndexRef.current = index;
  };

  const clearSelection = () => {
    flushSync(() => setSelectedSlots([]));
    onSlotSelect(null, []);
    lastShiftIndexRef.current = null;
  };

  useEffect(() => {
    const endDrag = () => {
      dragActiveRef.current = false;
      dragAnchorIndexRef.current = null;
    };
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("blur", endDrag);
    return () => {
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("blur", endDrag);
    };
  }, []);

  const applyDragRange = (fromIdx: number, toIdx: number) => {
    if (maxSelections === 1) return;
    const from = Math.min(fromIdx, toIdx);
    const to = Math.max(fromIdx, toIdx);
    const slice = slots.slice(from, to + 1).filter((s) => !isSlotDisabled(s));
    const enriched = slice.map((s) => enrich(s));
    flushSync(() => {
      setSelectedSlots(enriched);
    });
    emitParent(enriched);
  };

  const onSlotMouseDown = (
    slot: TimeSlot,
    index: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (e.button !== 0 || isSlotDisabled(slot)) return;
    dragActiveRef.current = true;
    dragAnchorIndexRef.current = index;
    lastShiftIndexRef.current = index;
  };

  const onSlotMouseEnter = (index: number) => {
    if (!dragActiveRef.current || dragAnchorIndexRef.current === null) return;
    applyDragRange(dragAnchorIndexRef.current, index);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (!resourceId || !date) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a game or resource to load time slots.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No time slots available for this date</p>
      </div>
    );
  }

  const numberOfSelectedSlots = selectedSlots.length;
  const contiguousForBooking = longestContiguousSorted(
    [...selectedSlots].sort((a, b) => compareBookingSlotStart(a.start_time, b.start_time)).map(stripToTimeSlot)
  );
  const resolvedRangeForWarning =
    selectedSlotRange.length > 0
      ? selectedSlotRange
      : selectedSlot
        ? [selectedSlot]
        : [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click a slot to select. Click again to deselect.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
          Clear Selection
        </Button>
        {numberOfSelectedSlots > 0 && (
          <span className="text-xs text-muted-foreground">
            {numberOfSelectedSlots} slot{numberOfSelectedSlots !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-600" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-white border border-gray-200" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gray-200" />
          <span>Unavailable</span>
        </div>
        {resolvedRangeForWarning.length > 1 && (
          <div className="ml-auto text-xs text-primary font-medium">
            {resolvedRangeForWarning.length} slots (
            {resolvedRangeForWarning[0].start_time} –{" "}
            {resolvedRangeForWarning[resolvedRangeForWarning.length - 1].end_time})
          </div>
        )}
      </div>

      {selectedSlot &&
        ((payAtVenueEnabled && contiguousForBooking.length < 1) ||
          (!payAtVenueEnabled && contiguousForBooking.length < 2)) && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 text-xs text-amber-700 dark:text-amber-400">
            {payAtVenueEnabled
              ? "Please select at least 1 slot (30 minutes)."
              : "Minimum booking is 2 slots (60 minutes). Select another consecutive slot, or use Shift+click / drag across a range."}
          </div>
        )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 select-none">
        {slots.map((slot, index) => {
          const slotId = makeSlotId(resourceId, date, slot.start_time, slot.end_time);
          const booked = isSlotDisabled(slot);
          const isSelected = selectedSlots.some((s) => s.id === slotId);

          return (
            <button
              key={slotId}
              type="button"
              disabled={booked}
              onClick={(e) => handleSlotClick(slot, index, e)}
              onMouseDown={(e) => onSlotMouseDown(slot, index, e)}
              onMouseEnter={() => onSlotMouseEnter(index)}
              aria-pressed={isSelected}
              className={cn(
                "px-4 py-2 rounded-lg transition-all duration-200 border text-sm font-medium",
                variant === "light" &&
                  booked &&
                  "bg-gray-200 text-gray-400 cursor-not-allowed border-transparent",
                variant === "light" &&
                  !booked &&
                  !isSelected &&
                  "bg-white hover:bg-gray-100 border-gray-200 text-gray-900",
                variant === "light" &&
                  !booked &&
                  isSelected &&
                  "bg-blue-500 text-white border-blue-600 shadow-sm",
                variant === "dark" &&
                  booked &&
                  "bg-white/5 text-gray-500 cursor-not-allowed border-white/10",
                variant === "dark" &&
                  !booked &&
                  !isSelected &&
                  "bg-white/10 hover:bg-white/15 border-white/15 text-gray-100",
                variant === "dark" &&
                  !booked &&
                  isSelected &&
                  "bg-blue-500 text-white border-blue-600 shadow-sm"
              )}
            >
              {formatTimeLabel(slot.start_time)} – {formatTimeLabel(slot.end_time)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
