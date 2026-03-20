-- Make sessions.station_id nullable so sessions can outlive their station
-- (preserves billing history when a station is deleted)
ALTER TABLE sessions
ALTER COLUMN station_id DROP NOT NULL;

COMMENT ON COLUMN sessions.station_id IS 'NULL when the originating station has been deleted; billing history is preserved via bill_items.name';

-- Add a deleted_station_name column to capture the name for display purposes
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS deleted_station_name TEXT DEFAULT NULL;

COMMENT ON COLUMN sessions.deleted_station_name IS 'Stores the original station name when the station row is deleted';
