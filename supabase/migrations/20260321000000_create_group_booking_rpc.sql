-- Create grouped bookings atomically for multi-resource checkout.
-- Each booking in p_bookings must include: station_id, start_time, end_time, player_count.

CREATE OR REPLACE FUNCTION public.create_group_booking(
  p_group_id uuid,
  p_customer_id uuid,
  p_booking_date date,
  p_notes text DEFAULT NULL,
  p_bookings jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE(booking_id uuid, station_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  v_station_id uuid;
  v_start_time time;
  v_end_time time;
  v_player_count integer;
  v_duration integer;
  v_rate numeric;
  v_created_booking_id uuid;
BEGIN
  IF jsonb_typeof(p_bookings) IS DISTINCT FROM 'array' OR jsonb_array_length(p_bookings) = 0 THEN
    RAISE EXCEPTION 'At least one booking is required';
  END IF;

  -- Validate all rows first so the function remains all-or-nothing.
  FOR item IN SELECT value FROM jsonb_array_elements(p_bookings) LOOP
    v_station_id := (item->>'station_id')::uuid;
    v_start_time := (item->>'start_time')::time;
    v_end_time := (item->>'end_time')::time;
    v_player_count := COALESCE((item->>'player_count')::integer, 1);

    IF v_station_id IS NULL OR v_start_time IS NULL OR v_end_time IS NULL THEN
      RAISE EXCEPTION 'Each booking must include station_id, start_time and end_time';
    END IF;

    IF v_end_time <= v_start_time THEN
      RAISE EXCEPTION 'Invalid time range for station %', v_station_id;
    END IF;

    IF v_player_count < 1 THEN
      RAISE EXCEPTION 'Player count must be at least 1 for station %', v_station_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.station_id = v_station_id
        AND b.booking_date = p_booking_date
        AND b.status IN ('confirmed', 'in-progress')
        AND (
          (b.start_time <= v_start_time AND b.end_time > v_start_time) OR
          (b.start_time < v_end_time AND b.end_time >= v_end_time) OR
          (b.start_time >= v_start_time AND b.end_time <= v_end_time) OR
          (b.start_time <= v_start_time AND b.end_time >= v_end_time)
        )
    ) THEN
      RAISE EXCEPTION 'Time slot is not available for station %', v_station_id;
    END IF;
  END LOOP;

  -- Insert only after full validation succeeded.
  FOR item IN SELECT value FROM jsonb_array_elements(p_bookings) LOOP
    v_station_id := (item->>'station_id')::uuid;
    v_start_time := (item->>'start_time')::time;
    v_end_time := (item->>'end_time')::time;
    v_player_count := COALESCE((item->>'player_count')::integer, 1);
    v_duration := GREATEST(1, (EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 60)::integer);

    SELECT hourly_rate INTO v_rate
    FROM public.stations
    WHERE id = v_station_id;

    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'Station not found: %', v_station_id;
    END IF;

    INSERT INTO public.bookings (
      booking_group_id,
      station_id,
      customer_id,
      booking_date,
      start_time,
      end_time,
      duration,
      status,
      player_count,
      notes,
      final_price,
      original_price
    )
    VALUES (
      p_group_id,
      v_station_id,
      p_customer_id,
      p_booking_date,
      v_start_time,
      v_end_time,
      v_duration,
      'confirmed',
      v_player_count,
      p_notes,
      v_rate * (v_duration / 60.0) * v_player_count,
      v_rate * (v_duration / 60.0) * v_player_count
    )
    RETURNING id INTO v_created_booking_id;

    booking_id := v_created_booking_id;
    station_id := v_station_id;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_booking(uuid, uuid, date, text, jsonb) TO anon, authenticated, service_role;
