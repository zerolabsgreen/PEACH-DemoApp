-- Create storage bucket `documents` if it doesn't exist and set simple policies

-- Create bucket (id and name are the same). Public so we can use getPublicUrl.
INSERT INTO storage.buckets (id, name, public)
SELECT 'documents', 'documents', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents');

-- Policies for storage.objects on this bucket
DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read access to documents'
  ) THEN
    CREATE POLICY "Public read access to documents" ON storage.objects
      FOR SELECT USING (bucket_id = 'documents');
  END IF;

  -- Authenticated insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload to documents'
  ) THEN
    CREATE POLICY "Authenticated can upload to documents" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
  END IF;

  -- Authenticated update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can update documents'
  ) THEN
    CREATE POLICY "Authenticated can update documents" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');
  END IF;

  -- Authenticated delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can delete documents'
  ) THEN
    CREATE POLICY "Authenticated can delete documents" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'documents');
  END IF;
END $$;


