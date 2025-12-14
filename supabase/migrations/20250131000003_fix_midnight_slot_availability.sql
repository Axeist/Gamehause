-- Fix get_available_slots to properly handle midnight slot (23:30-00:00) availability
-- The issue: When checking if slot 23:30-00:00 overlaps with existing bookings,
-- the TIME comparison fails because 00:00:00 < 23:30:00 in TIME type.
-- Solution: Special handling for midnight (00:00:00) as end of day.

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_date date, 
  p_station_id uuid, 
  p_slot_duration integer DEFAULT 60
)
RETURNS TABLE(start_time time without time zone, end_time time without time zone, is_available boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  opening_time TIME := '11:00:00';  -- 11 AM opening time
  curr_time TIME;
  slot_end_time TIME;
BEGIN
  -- Generate time slots from opening to midnight
  curr_time := opening_time;
  
  -- Loop until we create a slot ending at midnight (00:00:00)
  WHILE TRUE LOOP
    -- Calculate the end time for this slot
    slot_end_time := curr_time + (p_slot_duration || ' minutes')::interval;
    
    -- If slot_end_time is 00:00:00, this is the last slot (ending at midnight)
    -- For 30-min slots: 23:30 + 30 min = 00:00:00
    IF slot_end_time = '00:00:00'::TIME THEN
      -- This is the last slot ending at midnight (23:30-00:00)
      -- Check availability for this slot with proper midnight handling
      -- Key insight: When end_time = 00:00:00, it means "end of day", so any booking
      -- that ends at midnight overlaps with this slot if it starts at or before 23:30
      is_available := NOT EXISTS (
        SELECT 1 
        FROM public.bookings b
        WHERE b.station_id = p_station_id 
          AND b.booking_date = p_date
          AND b.status IN ('confirmed', 'in-progress')
          AND (
            -- Overlap if booking ends at midnight (00:00:00) and starts at or before slot start (23:30)
            (b.end_time = '00:00:00'::TIME AND b.start_time <= curr_time) OR
            -- Overlap if booking starts at or before slot start (23:30) and ends after slot start
            -- (but not at midnight, as that case is handled above)
            (b.start_time <= curr_time AND b.end_time != '00:00:00'::TIME AND b.end_time > curr_time) OR
            -- Overlap if booking starts within the slot (at or after 23:30) and ends at midnight
            (b.start_time >= curr_time AND b.end_time = '00:00:00'::TIME) OR
            -- Overlap if booking is completely contained within the slot
            (b.start_time >= curr_time AND b.end_time != '00:00:00'::TIME AND b.end_time <= slot_end_time)
          )
      );
      
      -- Check if there's an active session that overlaps with this slot for today
      IF p_date = CURRENT_DATE AND is_available THEN
        is_available := NOT EXISTS (
          SELECT 1
          FROM public.sessions s
          WHERE s.station_id = p_station_id
          AND s.end_time IS NULL
          AND DATE(s.start_time) = p_date
          AND CURRENT_TIME >= curr_time  -- Current time is at or after slot start
          AND (CURRENT_TIME < slot_end_time OR slot_end_time = '00:00:00'::TIME)  -- Handle midnight
        );
      END IF;
      
      RETURN QUERY SELECT curr_time, slot_end_time, is_available;
      EXIT; -- This was the last slot
    END IF;
    
    -- For all other slots (not ending at midnight)
    -- Check if this time slot overlaps with any existing booking
    is_available := NOT EXISTS (
      SELECT 1 
      FROM public.bookings b
      WHERE b.station_id = p_station_id 
        AND b.booking_date = p_date
        AND b.status IN ('confirmed', 'in-progress')
        AND (
          -- Standard overlap cases
          (b.start_time <= curr_time AND b.end_time > curr_time) OR
          (b.start_time < slot_end_time AND b.end_time >= slot_end_time) OR
          (b.start_time >= curr_time AND b.end_time <= slot_end_time) OR
          -- Also handle case where existing booking ends at midnight
          (b.start_time <= curr_time AND b.end_time = '00:00:00'::TIME)
        )
    );
    
    -- Check if there's an active session that overlaps with this slot for today
    IF p_date = CURRENT_DATE AND is_available THEN
      is_available := NOT EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.station_id = p_station_id
        AND s.end_time IS NULL
        AND DATE(s.start_time) = p_date
        AND CURRENT_TIME >= curr_time  -- Current time is at or after slot start
        AND CURRENT_TIME < slot_end_time  -- Current time is before slot end
      );
    END IF;
    
    RETURN QUERY SELECT curr_time, slot_end_time, is_available;
    
    -- Move to next slot
    curr_time := slot_end_time;
    
    -- Safety check: if we've somehow wrapped around incorrectly, exit
    -- This shouldn't happen, but prevents infinite loops
    IF curr_time < opening_time AND curr_time != '00:00:00'::TIME THEN
      EXIT;
    END IF;
  END LOOP;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_available_slots IS 'Returns available time slots for a station on a given date. Properly handles midnight (00:00:00) as end of day.';
