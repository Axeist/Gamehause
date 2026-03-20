-- Migration: Console player count model
-- Replaces individual controller stations with console + player_count bookings
-- Fully non-destructive: old controller rows are soft-hidden, not deleted

-- 1. Add max_players to stations (null = not applicable / unlimited)
ALTER TABLE stations
ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT NULL;

COMMENT ON COLUMN stations.max_players IS 'Max players per session for this station. Null = not applicable. Used for PS5 consoles.';

-- 2. Add player_count to bookings (default 1 = backward-compatible with all existing bookings)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS player_count INTEGER NOT NULL DEFAULT 1
CHECK (player_count >= 1 AND player_count <= 10);

COMMENT ON COLUMN bookings.player_count IS 'Number of players in this booking slot. Multiplied against hourly_rate for total price.';

-- 3. Set max_players=4 on all PS5 console rows (non-controller parent stations)
UPDATE stations
SET max_players = 4
WHERE type = 'ps5'
  AND (is_controller IS NULL OR is_controller = false)
  AND (parent_station_id IS NULL);

-- 4. Soft-hide individual controller rows so they no longer appear in any booking UI
-- These rows are KEPT (not deleted) to preserve FK integrity for historical bookings
UPDATE stations
SET is_public_booking = false
WHERE type = 'ps5'
  AND is_controller = true;
