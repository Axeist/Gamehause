-- Fix get_available_slots: `slot_end_time >= '02:00:00'` was wrong because TIME orders
-- 02:00 before 11:30, so 11:30 >= 02:00 is TRUE and only the first slot was returned.
CREATE OR REPLACE FUNCTION public.get_available_slots(p_date date, p_station_id uuid, p_slot_duration integer DEFAULT 60)
 RETURNS TABLE(start_time time without time zone, end_time time without time zone, is_available boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
  opening_time TIME := '11:00:00';
  last_slot_end TIME := '02:00:00';
  curr_time TIME;
  slot_end_time TIME;
BEGIN
  curr_time := opening_time;

  LOOP
    slot_end_time := curr_time + (p_slot_duration || ' minutes')::interval;

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

    IF p_date = CURRENT_DATE AND is_available THEN
      is_available := NOT EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.station_id = p_station_id
          AND s.end_time IS NULL
          AND DATE(s.start_time) = p_date
      );
    END IF;

    RETURN QUERY SELECT curr_time, slot_end_time, is_available;

    EXIT WHEN slot_end_time = last_slot_end;

    curr_time := slot_end_time;
  END LOOP;
END;
$function$;
