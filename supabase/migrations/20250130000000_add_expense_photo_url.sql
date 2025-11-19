-- Add photo_url column to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN expenses.photo_url IS 'URL of the photo/receipt uploaded for this expense';

-- Create storage bucket for expense receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for expense-receipts bucket
DO $$
BEGIN
  -- Allow authenticated users to upload files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to upload expense receipts'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload expense receipts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'expense-receipts');
  END IF;

  -- Allow authenticated users to update their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to update expense receipts'
  ) THEN
    CREATE POLICY "Allow authenticated users to update expense receipts"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'expense-receipts')
    WITH CHECK (bucket_id = 'expense-receipts');
  END IF;

  -- Allow authenticated users to delete files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to delete expense receipts'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete expense receipts"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'expense-receipts');
  END IF;

  -- Allow public read access (since bucket is public)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public read access to expense receipts'
  ) THEN
    CREATE POLICY "Allow public read access to expense receipts"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'expense-receipts');
  END IF;
END $$;

