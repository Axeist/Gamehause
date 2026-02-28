-- Option to show available coupons on the public booking page (with Apply buttons).
INSERT INTO public.app_config (key, value)
VALUES ('booking_coupons_show_list', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
