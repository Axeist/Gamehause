import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface TimeSlot {
  start_time: string; // e.g., "11:00"
  end_time: string;   // e.g., "12:00"
  is_available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  selectedSlotRange?: TimeSlot[];
  onSlotSelect: (slot: TimeSlot, range?: TimeSlot[]) => void;
  loading?: boolean;
}

// Helper to format a "HH:mm" string into a localized time (e.g., 11:00 AM)
const formatTime = (timeString: string) => {
  // Safely construct a Date at an arbitrary fixed date with the given time
  const [h, m] = timeString.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  selectedSlotRange = [],
  onSlotSelect,
  loading = false,
}) => {
  const [startSlot, setStartSlot] = React.useState<TimeSlot | null>(null);

  // Helper to check if a slot is in the selected range
  const isInRange = (slot: TimeSlot) => {
    if (selectedSlotRange.length === 0) return false;
    return selectedSlotRange.some(s => s.start_time === slot.start_time);
  };

  // Helper to get consecutive available slots from start to end
  const getConsecutiveSlots = (start: TimeSlot): TimeSlot[] => {
    const result: TimeSlot[] = [start];
    let current = start;
    
    while (true) {
      // Find the next slot that starts where current ends
      const next = slots.find(s => 
        s.start_time === current.end_time && 
        s.is_available
      );
      
      if (!next) break;
      result.push(next);
      current = next;
    }
    
    return result;
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.is_available) return;

    // Check if clicking on the first slot of an existing range - if so, deselect
    if (selectedSlotRange.length > 0 && selectedSlotRange[0].start_time === slot.start_time) {
      // Deselect by passing null and empty range
      setStartSlot(null);
      onSlotSelect(null!, []);
      return;
    }

    if (!startSlot) {
      // First click - set as start
      setStartSlot(slot);
      onSlotSelect(slot, [slot]);
    } else {
      // Second click - check if it's a valid end slot
      const range = getConsecutiveSlots(startSlot);
      const endIndex = range.findIndex(s => s.start_time === slot.start_time);
      
      if (endIndex >= 0) {
        // Valid range - select all slots from start to end
        const selectedRange = range.slice(0, endIndex + 1);
        onSlotSelect(startSlot, selectedRange);
      } else {
        // Invalid - reset and set new start
        setStartSlot(slot);
        onSlotSelect(slot, [slot]);
      }
    }
  };

  React.useEffect(() => {
    // Reset start slot when selectedSlot changes externally
    if (!selectedSlot) {
      setStartSlot(null);
    }
  }, [selectedSlot]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
        ))}
      </div>
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

  const numberOfSelectedSlots = selectedSlotRange.length > 0 ? selectedSlotRange.length : (selectedSlot ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-sm" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted border rounded-sm" />
          <span>Booked</span>
        </div>
        {selectedSlotRange.length > 1 && (
          <div className="ml-auto text-xs text-primary font-medium">
            {selectedSlotRange.length} slots selected ({formatTime(selectedSlotRange[0].start_time)} - {formatTime(selectedSlotRange[selectedSlotRange.length - 1].end_time)})
          </div>
        )}
      </div>
      
      {selectedSlot && numberOfSelectedSlots < 2 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 text-xs text-amber-400">
          ⚠️ Minimum booking is 2 slots (60 minutes). Click another consecutive slot to complete your selection.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.start_time === slot.start_time;
          const inRange = isInRange(slot);
          const isStart = startSlot?.start_time === slot.start_time;

          return (
            <Button
              key={index}
              variant={
                inRange 
                  ? "default" 
                  : isSelected 
                    ? "default" 
                    : slot.is_available 
                      ? "outline" 
                      : "ghost"
              }
              disabled={!slot.is_available}
              onClick={() => handleSlotClick(slot)}
              className={`h-12 flex flex-col items-center justify-center text-xs relative ${
                !slot.is_available ? "opacity-50 cursor-not-allowed" : ""
              } ${inRange ? "ring-2 ring-primary" : ""}`}
              aria-pressed={isSelected || inRange}
            >
              <div className="font-medium">{formatTime(slot.start_time)}</div>
              <div className="text-xs opacity-70">{formatTime(slot.end_time)}</div>

              {inRange && !isStart && (
                <div className="absolute -top-1 -right-1">
                  <Badge className="text-xs px-1 py-0 text-[10px] leading-3 bg-primary">
                    +
                  </Badge>
                </div>
              )}

              {!slot.is_available && (
                <div className="absolute -top-1 -right-1">
                  <Badge
                    variant="destructive"
                    className="text-xs px-1 py-0 text-[10px] leading-3"
                  >
                    Booked
                  </Badge>
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
