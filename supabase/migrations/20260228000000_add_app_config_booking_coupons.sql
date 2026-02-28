-- Configurable booking coupons: one config row keyed by 'booking_coupons', value = JSON array of coupons.
-- Each coupon: code, description, discount_type ('percentage' | 'fixed'), discount_value (number), enabled (boolean).

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on app_config" ON public.app_config;
CREATE POLICY "Allow all operations on app_config"
  ON public.app_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.app_config TO anon, authenticated;

-- Seed booking_coupons as empty array so admin can add coupons
INSERT INTO public.app_config (key, value)
VALUES ('booking_coupons', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;
