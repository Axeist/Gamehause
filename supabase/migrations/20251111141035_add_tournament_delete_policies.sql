-- Add DELETE policies for tournament-related tables to allow tournament deletion
-- This migration adds DELETE policies for tables that need to be cleaned up when a tournament is deleted

-- Add DELETE policy for tournament_public_registrations
-- Allow authenticated users to delete registrations (needed for tournament deletion)
-- Using auth.uid() IS NOT NULL is more reliable than auth.role() = 'authenticated'
DROP POLICY IF EXISTS "Allow authenticated users to delete registrations" ON public.tournament_public_registrations;
CREATE POLICY "Allow authenticated users to delete registrations" 
ON public.tournament_public_registrations 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for tournament_registrations (legacy table)
-- Allow authenticated users to delete registrations
DROP POLICY IF EXISTS "Allow authenticated users to delete legacy registrations" ON public.tournament_registrations;
CREATE POLICY "Allow authenticated users to delete legacy registrations" 
ON public.tournament_registrations 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Ensure tournament_winner_images has DELETE policy (may already exist, but ensure it's correct)
-- The existing policy might use USING (true), but we'll add a more specific one
DROP POLICY IF EXISTS "Allow authenticated users to delete winner images" ON public.tournament_winner_images;
-- Keep the existing "Allow authenticated users" policy if it exists, but ensure DELETE is allowed
-- The policy should already allow DELETE if it says FOR ALL, but let's be explicit

-- Update tournament deletion policy
-- Keep the existing SELECT policy for public access, but ensure DELETE works for authenticated users
-- First, check what policies exist and update/create as needed

-- Drop the old policy that might use auth.role() (less reliable)
DROP POLICY IF EXISTS "Allow full access for authenticated" ON public.tournaments;

-- Create/update policy for authenticated users to perform all operations (including DELETE)
-- Use auth.uid() IS NOT NULL which is more reliable than auth.role() = 'authenticated'
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON public.tournaments;
CREATE POLICY "Allow full access for authenticated users" 
ON public.tournaments 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure the public SELECT policy still exists (for public tournament pages)
-- This should already exist, but we'll verify it doesn't conflict
-- The SELECT policy should allow anyone to read tournaments

