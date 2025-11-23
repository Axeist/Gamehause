-- Create slot_reservations table to temporarily reserve slots (like RedBus/BookMyShow)
-- This prevents duplicate bookings when multiple users select the same slot simultaneously
CREATE TABLE IF NOT EXISTS public.slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  customer_phone TEXT, -- Optional: to identify who reserved it
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one reservation per station/slot combination
  UNIQUE(station_id, booking_date, start_time, end_time)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_slot_reservations_lookup 
  ON public.slot_reservations(station_id, booking_date, start_time, end_time, expires_at);

-- Index for cleanup of expired reservations
CREATE INDEX IF NOT EXISTS idx_slot_reservations_expires 
  ON public.slot_reservations(expires_at);

-- Function to reserve a slot (returns true if successful, false if already reserved)
CREATE OR REPLACE FUNCTION public.reserve_slot(
  p_station_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_customer_phone TEXT DEFAULT NULL,
  p_reservation_duration_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- First, clean up expired reservations for this slot
  DELETE FROM public.slot_reservations
  WHERE station_id = p_station_id
    AND booking_date = p_booking_date
    AND start_time = p_start_time
    AND end_time = p_end_time
    AND expires_at < NOW();
  
  -- Check if slot is already reserved (and not expired)
  IF EXISTS (
    SELECT 1 FROM public.slot_reservations
    WHERE station_id = p_station_id
      AND booking_date = p_booking_date
      AND start_time = p_start_time
      AND end_time = p_end_time
      AND expires_at > NOW()
  ) THEN
    RETURN FALSE; -- Slot is already reserved
  END IF;
  
  -- Reserve the slot
  v_expires_at := NOW() + (p_reservation_duration_minutes || ' minutes')::INTERVAL;
  
  INSERT INTO public.slot_reservations (
    station_id,
    booking_date,
    start_time,
    end_time,
    customer_phone,
    expires_at
  ) VALUES (
    p_station_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_customer_phone,
    v_expires_at
  )
  ON CONFLICT (station_id, booking_date, start_time, end_time) 
  DO UPDATE SET
    reserved_at = NOW(),
    expires_at = v_expires_at,
    customer_phone = p_customer_phone;
  
  RETURN TRUE; -- Successfully reserved
END;
$$;

-- Function to release a slot reservation
CREATE OR REPLACE FUNCTION public.release_slot_reservation(
  p_station_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.slot_reservations
  WHERE station_id = p_station_id
    AND booking_date = p_booking_date
    AND start_time = p_start_time
    AND end_time = p_end_time;
END;
$$;

-- Function to clean up expired reservations (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.slot_reservations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Update get_available_slots to exclude reserved slots
CREATE OR REPLACE FUNCTION public.get_available_slots(p_date date, p_station_id uuid, p_slot_duration integer DEFAULT 60)
 RETURNS TABLE(start_time time without time zone, end_time time without time zone, is_available boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
  opening_time TIME := '11:00:00';  -- 11 AM opening time
  curr_time TIME;
  slot_end_time TIME;
BEGIN
  -- Clean up expired reservations first
  PERFORM public.cleanup_expired_reservations();
  
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
      
      -- Check if slot is reserved
      IF is_available THEN
        is_available := NOT EXISTS (
          SELECT 1
          FROM public.slot_reservations sr
          WHERE sr.station_id = p_station_id
            AND sr.booking_date = p_date
            AND sr.start_time = curr_time
            AND sr.end_time = slot_end_time
            AND sr.expires_at > NOW()
        );
      END IF;
      
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
    
    -- Check if slot is reserved
    IF is_available THEN
      is_available := NOT EXISTS (
        SELECT 1
        FROM public.slot_reservations sr
        WHERE sr.station_id = p_station_id
          AND sr.booking_date = p_date
          AND sr.start_time = curr_time
          AND sr.end_time = slot_end_time
          AND sr.expires_at > NOW()
      );
    END IF;
    
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

