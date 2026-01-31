/**
 * Real-time booking validation utilities
 * Prevents duplicate bookings for the same station at overlapping times
 */

import { supabase } from '@/integrations/supabase/client';

export interface BookingSlot {
  station_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
}

export interface BookingConflict {
  station_id: string;
  station_name?: string;
  existing_booking_id: string;
  existing_start_time: string;
  existing_end_time: string;
}

/**
 * Check if booking slots have conflicts with existing bookings
 * This is called BEFORE creating bookings to prevent duplicates
 */
export async function checkBookingConflicts(
  slots: BookingSlot[]
): Promise<{ hasConflict: boolean; conflicts: BookingConflict[] }> {
  if (slots.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  const conflicts: BookingConflict[] = [];

  // Check each slot for conflicts
  for (const slot of slots) {
    // Use the database function for overlap checking
    const { data: hasOverlap, error: overlapError } = await (supabase as any).rpc('check_booking_overlap', {
      p_station_id: slot.station_id,
      p_booking_date: slot.booking_date,
      p_start_time: slot.start_time,
      p_end_time: slot.end_time,
      p_exclude_booking_id: null,
    });

    if (overlapError) {
      console.error('Error checking booking conflicts:', overlapError);
      // On error, assume conflict to be safe
      return { hasConflict: true, conflicts: [] };
    }

    if (hasOverlap === true) {
      // If overlap detected, get the conflicting booking details
      const { data: allActiveBookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          station_id,
          start_time,
          end_time,
          stations!inner(name)
        `)
        .eq('station_id', slot.station_id)
        .eq('booking_date', slot.booking_date)
        .in('status', ['confirmed', 'in-progress']);

      if (error) {
        console.error('Error checking booking conflicts:', error);
        // On error, assume conflict to be safe
        return { hasConflict: true, conflicts: [] };
      }

      // Standard overlap check (no midnight handling needed - slots end at 23:59:59)
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;

      const overlappingBookings = allActiveBookings?.filter(booking => {
        const bStart = booking.start_time;
        const bEnd = booking.end_time;
        
        // Standard overlap check
        return (
          (bStart <= slotStart && bEnd > slotStart) ||  // Case 1: Existing starts during new
          (bStart < slotEnd && bEnd >= slotEnd) ||     // Case 2: Existing ends during new
          (bStart >= slotStart && bEnd <= slotEnd) ||  // Case 3: Existing contained in new
          (bStart <= slotStart && bEnd >= slotEnd)     // Case 4: New contained in existing
        );
      });

      if (overlappingBookings && overlappingBookings.length > 0) {
        for (const booking of overlappingBookings) {
          conflicts.push({
            station_id: slot.station_id,
            station_name: (booking.stations as any)?.name,
            existing_booking_id: booking.id,
            existing_start_time: booking.start_time,
            existing_end_time: booking.end_time,
          });
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Validate booking slots using database function (more efficient)
 */
export async function validateBookingSlots(
  slots: BookingSlot[]
): Promise<{ valid: boolean; error?: string }> {
  if (slots.length === 0) {
    return { valid: true };
  }

  try {
    // Use the database function for validation
    for (const slot of slots) {
      const { data, error } = await (supabase as any).rpc('check_booking_overlap', {
        p_station_id: slot.station_id,
        p_booking_date: slot.booking_date,
        p_start_time: slot.start_time,
        p_end_time: slot.end_time,
        p_exclude_booking_id: null,
      });

      if (error) {
        console.error('Error validating booking slot:', error);
        return {
          valid: false,
          error: `Validation error: ${error.message}`,
        };
      }

      if (data === true) {
        return {
          valid: false,
          error: `Booking conflict: Another booking already exists for this station at ${slot.booking_date} from ${slot.start_time} to ${slot.end_time}`,
        };
      }
    }

    return { valid: true };
  } catch (err: any) {
    console.error('Error in validateBookingSlots:', err);
    return {
      valid: false,
      error: err.message || 'Unknown validation error',
    };
  }
}

/**
 * Get human-readable conflict message
 */
export function getConflictMessage(conflicts: BookingConflict[]): string {
  if (conflicts.length === 0) return '';

  const stationNames = conflicts
    .map((c) => c.station_name || 'Unknown Station')
    .filter((name, index, arr) => arr.indexOf(name) === index);

  if (conflicts.length === 1) {
    const conflict = conflicts[0];
    return `This time slot is already booked for ${conflict.station_name || 'this station'} (${conflict.existing_start_time} - ${conflict.existing_end_time}). Please select a different time.`;
  }

  return `These time slots are already booked for ${stationNames.join(', ')}. Please select different times.`;
}

