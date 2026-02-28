-- Enable/disable the public booking page. When false, the booking page shows as unavailable.
INSERT INTO public.app_config (key, value)
VALUES ('public_booking_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
