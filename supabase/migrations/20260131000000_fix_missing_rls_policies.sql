-- Fix missing RLS policies that block client writes.
-- The app uses a custom username/password table (`admin_users`) and does not use Supabase Auth,
-- so many operations run as `anon` and will fail if RLS is enabled without permissive policies.

-- -----------------------------
-- Stations
-- -----------------------------
ALTER TABLE IF EXISTS public.stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on stations" ON public.stations;
CREATE POLICY "Allow all operations on stations"
  ON public.stations
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.stations TO anon, authenticated;

-- -----------------------------
-- Customers (enabled elsewhere, but no policy existed)
-- -----------------------------
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;
CREATE POLICY "Allow all operations on customers"
  ON public.customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.customers TO anon, authenticated;

-- -----------------------------
-- Cash summary (RLS was enabled in earlier migrations, but policy was missing)
-- -----------------------------
ALTER TABLE IF EXISTS public.cash_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on cash_summary" ON public.cash_summary;
CREATE POLICY "Allow all operations on cash_summary"
  ON public.cash_summary
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.cash_summary TO anon, authenticated;

-- -----------------------------
-- Offers (existing policy required Supabase Auth; switch to permissive policy)
-- -----------------------------
ALTER TABLE IF EXISTS public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for offers" ON public.offers;
DROP POLICY IF EXISTS "Allow full access for authenticated users on offers" ON public.offers;

CREATE POLICY "Allow read access for offers"
  ON public.offers
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all operations on offers"
  ON public.offers
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.offers TO anon, authenticated;

