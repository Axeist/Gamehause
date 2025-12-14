-- PERFORMANCE FIX: Optimize get_available_slots to prevent timeouts
-- Uses a single set-returning query instead of looping with multiple queries

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_date date, 
  p_station_id uuid, 
  p_slot_duration integer DEFAULT 60
)
RETURNS TABLE(start_time time without time zone, end_time time without time zone, is_available boolean)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  opening_time TIME := '11:00:00';  -- 11 AM opening time
  closing_time TIME := '23:59:59';  -- 11:59:59 PM - end of day
  total_minutes INTEGER;
  slot_count INTEGER;
BEGIN
  -- Calculate total minutes and number of slots
  total_minutes := EXTRACT(EPOCH FROM (closing_time - opening_time))::INTEGER / 60;
  slot_count := (total_minutes / p_slot_duration) + CASE WHEN total_minutes % p_slot_duration > 0 THEN 1 ELSE 0 END;
  
  -- Generate all slots and check availability in a single optimized query
  -- Uses LEFT JOIN to check overlaps efficiently
  RETURN QUERY
  WITH slot_times AS (
    SELECT 
      (opening_time + (n * p_slot_duration || ' minutes')::interval)::TIME AS slot_start,
      LEAST(
        (opening_time + ((n + 1) * p_slot_duration || ' minutes')::interval)::TIME,
        closing_time
      ) AS slot_end
    FROM generate_series(0, slot_count - 1) AS n
    WHERE (opening_time + (n * p_slot_duration || ' minutes')::interval)::TIME < closing_time
  ),
  active_bookings AS (
    -- Fetch all bookings ONCE (single query)
    SELECT b.start_time, b.end_time
    FROM public.bookings b
    WHERE b.station_id = p_station_id 
      AND b.booking_date = p_date
      AND b.status IN ('confirmed', 'in-progress')
  ),
  active_session AS (
    -- Fetch active session ONCE if today
    SELECT s.start_time::TIME AS session_start
    FROM public.sessions s
    WHERE p_date = CURRENT_DATE
      AND s.station_id = p_station_id
      AND s.end_time IS NULL
      AND DATE(s.start_time) = p_date
    LIMIT 1
  )
  SELECT 
    st.slot_start AS start_time,
    st.slot_end AS end_time,
    -- Check availability: no overlapping booking AND no active session in this slot
    NOT EXISTS (
      SELECT 1
      FROM active_bookings ab
      WHERE (
        (ab.start_time <= st.slot_start AND ab.end_time > st.slot_start) OR
        (ab.start_time < st.slot_end AND ab.end_time >= st.slot_end) OR
        (ab.start_time >= st.slot_start AND ab.end_time <= st.slot_end) OR
        (ab.start_time <= st.slot_start AND ab.end_time >= st.slot_end)
      )
    ) AND NOT (
      p_date = CURRENT_DATE 
      AND EXISTS (SELECT 1 FROM active_session)
      AND CURRENT_TIME >= st.slot_start 
      AND CURRENT_TIME < st.slot_end
    ) AS is_available
  FROM slot_times st
  ORDER BY st.slot_start;
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.get_available_slots IS 'Returns available time slots for a station on a given date. Slots end at 23:59:59. PERFORMANCE OPTIMIZED: Uses single query with CTEs instead of loops.';
