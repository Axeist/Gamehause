-- Disable RLS on all tournament-related tables for 2-user app
-- This migration removes all RLS policies and disables RLS

-- Disable RLS on tournaments table
ALTER TABLE IF EXISTS public.tournaments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on tournaments
DROP POLICY IF EXISTS "Allow read access for all users" ON public.tournaments;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON public.tournaments;
DROP POLICY IF EXISTS "Allow all operations on tournaments" ON public.tournaments;

-- Disable RLS on tournament_winners table
ALTER TABLE IF EXISTS public.tournament_winners DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on tournament_winners
DROP POLICY IF EXISTS "Anyone can view tournament winners" ON public.tournament_winners;
DROP POLICY IF EXISTS "Allow all operations on tournament_winners" ON public.tournament_winners;
DROP POLICY IF EXISTS "Allow full access to tournament_winners for authenticated users" ON public.tournament_winners;
DROP POLICY IF EXISTS "Allow read access to tournament_winners for anonymous users" ON public.tournament_winners;

-- Disable RLS on tournament_history table
ALTER TABLE IF EXISTS public.tournament_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on tournament_history
DROP POLICY IF EXISTS "Anyone can view tournament history" ON public.tournament_history;
DROP POLICY IF EXISTS "Allow all operations on tournament_history" ON public.tournament_history;

-- Disable RLS on tournament_winner_images table
ALTER TABLE IF EXISTS public.tournament_winner_images DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on tournament_winner_images
DROP POLICY IF EXISTS "Allow authenticated users to delete winner images" ON public.tournament_winner_images;
DROP POLICY IF EXISTS "Allow all operations on tournament_winner_images" ON public.tournament_winner_images;

-- Disable RLS on tournament_public_registrations table
ALTER TABLE IF EXISTS public.tournament_public_registrations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on tournament_public_registrations
DROP POLICY IF EXISTS "Allow public read access to tournament registrations" ON public.tournament_public_registrations;
DROP POLICY IF EXISTS "Allow public insert for tournament registrations" ON public.tournament_public_registrations;

-- Ensure tournament_winners has tournament_name column (in case it's missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_winners' 
    AND column_name = 'tournament_name'
  ) THEN
    -- If tournament_name doesn't exist, we'll need to add it
    -- But first check if we can derive it from tournaments table
    ALTER TABLE public.tournament_winners 
    ADD COLUMN tournament_name text;
    
    -- Try to populate from tournaments table if possible
    UPDATE public.tournament_winners tw
    SET tournament_name = t.name
    FROM public.tournaments t
    WHERE tw.tournament_id = t.id
    AND tw.tournament_name IS NULL;
  END IF;
END $$;

-- Ensure tournament_winner_images has uploaded_at column (or use created_at)
DO $$ 
BEGIN
  -- Check if uploaded_at exists, if not, add it or use created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tournament_winner_images' 
    AND column_name = 'uploaded_at'
  ) THEN
    -- Add uploaded_at column and populate from created_at if it exists
    ALTER TABLE public.tournament_winner_images 
    ADD COLUMN uploaded_at timestamp with time zone;
    
    -- If created_at exists, copy its value
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tournament_winner_images' 
      AND column_name = 'created_at'
    ) THEN
      UPDATE public.tournament_winner_images
      SET uploaded_at = created_at
      WHERE uploaded_at IS NULL;
    ELSE
      -- Set default if created_at doesn't exist
      UPDATE public.tournament_winner_images
      SET uploaded_at = now()
      WHERE uploaded_at IS NULL;
    END IF;
  END IF;
END $$;

-- Grant necessary permissions (make sure all users can access)
GRANT ALL ON public.tournaments TO anon, authenticated;
GRANT ALL ON public.tournament_winners TO anon, authenticated;
GRANT ALL ON public.tournament_history TO anon, authenticated;
GRANT ALL ON public.tournament_winner_images TO anon, authenticated;
GRANT ALL ON public.tournament_public_registrations TO anon, authenticated;

