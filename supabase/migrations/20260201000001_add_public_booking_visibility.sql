-- Add a toggle to hide/show stations on public booking page
ALTER TABLE stations
ADD COLUMN IF NOT EXISTS is_public_booking BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN stations.is_public_booking IS 'If false, station is hidden from /public/booking (public booking flow)';

