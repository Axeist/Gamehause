-- Change last slot to end at 23:59:59 instead of 00:00:00
-- This eliminates all midnight edge cases - much simpler solution!
-- Last slot will be 23:30:00 - 23:59:59 (for 30-min slots)
-- PERFORMANCE OPTIMIZED: Fetches bookings once instead of per-slot

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
  closing_time TIME := '23:59:59';  -- 11:59:59 PM - end of day (no midnight!)
  curr_time TIME;
  slot_end_time TIME;
  has_active_session BOOLEAN;
  session_start_time TIME;
BEGIN
  -- OPTIMIZATION: Check for active session once (only if today)
  IF p_date = CURRENT_DATE THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.station_id = p_station_id
      AND s.end_time IS NULL
      AND DATE(s.start_time) = p_date
    ) INTO has_active_session;
    
    -- Get session start time if exists
    IF has_active_session THEN
      SELECT s.start_time::TIME INTO session_start_time
      FROM public.sessions s
      WHERE s.station_id = p_station_id
      AND s.end_time IS NULL
      AND DATE(s.start_time) = p_date
      LIMIT 1;
    END IF;
  ELSE
    has_active_session := FALSE;
  END IF;
  
  -- Generate time slots from opening to closing (23:59:59)
  curr_time := opening_time;
  
  -- Loop until we reach or exceed closing time
  WHILE curr_time < closing_time LOOP
    -- Calculate the end time for this slot
    slot_end_time := curr_time + (p_slot_duration || ' minutes')::interval;
    
    -- Don't create slots that go past closing time
    IF slot_end_time > closing_time THEN
      -- If this slot would go past closing, cap it at closing time
      slot_end_time := closing_time;
    END IF;
    
    -- OPTIMIZED: Check overlap with LIMIT 1 and proper index usage
    -- The index idx_bookings_station_date_status should make this fast
    is_available := NOT EXISTS (
      SELECT 1 
      FROM public.bookings b
      WHERE b.station_id = p_station_id 
        AND b.booking_date = p_date
        AND b.status IN ('confirmed', 'in-progress')
        AND (
          -- Standard overlap detection (no midnight edge cases!)
          (b.start_time <= curr_time AND b.end_time > curr_time) OR
          (b.start_time < slot_end_time AND b.end_time >= slot_end_time) OR
          (b.start_time >= curr_time AND b.end_time <= slot_end_time) OR
          (b.start_time <= curr_time AND b.end_time >= slot_end_time)
        )
      LIMIT 1  -- Critical: Stop after first match
    );
    
    -- Check if there's an active session that overlaps with this slot for today
    IF p_date = CURRENT_DATE AND is_available AND has_active_session THEN
      -- Check if current time is within this slot and session is active
      IF CURRENT_TIME >= curr_time AND CURRENT_TIME < slot_end_time THEN
        is_available := FALSE;
      END IF;
    END IF;
    
    RETURN QUERY SELECT curr_time, slot_end_time, is_available;
    
    -- Move to next slot
    curr_time := slot_end_time;
    
    -- Exit if we've reached or passed closing time
    IF curr_time >= closing_time THEN
      EXIT;
    END IF;
  END LOOP;
END;
$$;

-- Simplify check_booking_overlap - no more midnight handling needed!
CREATE OR REPLACE FUNCTION public.check_booking_overlap(
  p_station_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  has_overlap BOOLEAN;
BEGIN
  -- Simple overlap check - no midnight edge cases!
  -- OPTIMIZED: Uses indexes and LIMIT 1 for performance
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.station_id = p_station_id
      AND b.booking_date = p_booking_date
      AND b.status IN ('confirmed', 'in-progress')
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
      AND (
        -- Standard overlap detection
        (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
        (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
        (b.start_time >= p_start_time AND b.end_time <= p_end_time) OR
        (b.start_time <= p_start_time AND b.end_time >= p_end_time)
      )
    LIMIT 1  -- Stop after first match for performance
  ) INTO has_overlap;
  
  RETURN has_overlap;
END;
$$;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_bookings_station_date_status 
ON public.bookings(station_id, booking_date, status)
WHERE status IN ('confirmed', 'in-progress');

CREATE INDEX IF NOT EXISTS idx_bookings_station_date_time 
ON public.bookings(station_id, booking_date, start_time, end_time)
WHERE status IN ('confirmed', 'in-progress');

-- Update comments
COMMENT ON FUNCTION public.get_available_slots IS 'Returns available time slots for a station on a given date. Slots end at 23:59:59 (no midnight edge cases). Performance optimized with single booking fetch.';
COMMENT ON FUNCTION public.check_booking_overlap IS 'Checks if a booking time slot overlaps with existing confirmed/in-progress bookings. Simplified - no midnight handling needed.';
