-- Revert get_available_slots to use the slot blocking fix from 20250125000002
-- This migration just ensures the function matches the fix (only block current slot when session is running)
-- Reservation logic has been temporarily removed
CREATE OR REPLACE FUNCTION public.get_available_slots(p_date date, p_station_id uuid, p_slot_duration integer DEFAULT 60)
 RETURNS TABLE(start_time time without time zone, end_time time without time zone, is_available boolean)
 LANGUAGE plpgsql
AS $function$
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
      -- This is the last slot ending at midnight
      -- Check availability for this slot
      is_available := NOT EXISTS (
        SELECT 1 
        FROM public.bookings b
        WHERE b.station_id = p_station_id 
          AND b.booking_date = p_date
          AND b.status IN ('confirmed', 'in-progress')
          AND (
            (b.start_time <= curr_time AND b.end_time > curr_time) OR
            (b.start_time < slot_end_time AND b.end_time >= slot_end_time) OR
            (b.start_time >= curr_time AND b.end_time <= slot_end_time)
          )
      );
      
      
      -- Check if there's an active session that overlaps with this slot for today
      -- Only block the CURRENT slot (where the session is happening right now)
      -- Past and future slots should remain available
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
          (b.start_time <= curr_time AND b.end_time > curr_time) OR
          (b.start_time < slot_end_time AND b.end_time >= slot_end_time) OR
          (b.start_time >= curr_time AND b.end_time <= slot_end_time)
        )
    );
    
    
    -- Check if there's an active session that overlaps with this slot for today
    -- Only block the CURRENT slot (where the session is happening right now)
    -- Past and future slots should remain available
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
$function$;

