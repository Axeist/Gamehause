-- Single-row loyalty program configuration (singleton id).

CREATE TABLE IF NOT EXISTS public.loyalty_config (
  id uuid PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  spend_threshold numeric NOT NULL DEFAULT 100,
  points_per_threshold integer NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_spend_threshold_positive CHECK (spend_threshold > 0),
  CONSTRAINT loyalty_points_per_threshold_nonneg CHECK (points_per_threshold >= 0)
);

ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on loyalty_config" ON public.loyalty_config;
CREATE POLICY "Allow all operations on loyalty_config"
  ON public.loyalty_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.loyalty_config TO anon, authenticated;

INSERT INTO public.loyalty_config (id, is_enabled, spend_threshold, points_per_threshold)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  100,
  10
)
ON CONFLICT (id) DO NOTHING;
