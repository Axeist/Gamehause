-- Add image_url column to stations table
ALTER TABLE stations
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN stations.image_url IS 'Public URL of the station image (Supabase Storage public bucket)';

-- Create storage bucket for station images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'station-images',
  'station-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Remove any existing RLS policies for station-images bucket
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to upload station images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to update station images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to delete station images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to station images" ON storage.objects;
END $$;

-- Create permissive storage policies for station-images bucket (effectively no RLS)
DO $$
BEGIN
  -- Allow everyone (anon and authenticated) to upload files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow all to upload station images'
  ) THEN
    CREATE POLICY "Allow all to upload station images"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'station-images');
  END IF;

  -- Allow everyone to update files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow all to update station images'
  ) THEN
    CREATE POLICY "Allow all to update station images"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'station-images')
    WITH CHECK (bucket_id = 'station-images');
  END IF;

  -- Allow everyone to delete files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow all to delete station images'
  ) THEN
    CREATE POLICY "Allow all to delete station images"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id = 'station-images');
  END IF;

  -- Allow public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow all to read station images'
  ) THEN
    CREATE POLICY "Allow all to read station images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'station-images');
  END IF;
END $$;

