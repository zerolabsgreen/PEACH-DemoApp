-- Extend file_type_enum with Organization Document
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'file_type_enum' AND e.enumlabel = 'Organization Document'
  ) THEN
    ALTER TYPE public.file_type_enum ADD VALUE 'Organization Document';
  END IF;
END $$;


