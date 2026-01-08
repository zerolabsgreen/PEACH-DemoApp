-- Migration: Update Organizations schema
-- Changes:
-- 1. Add name_expanded column (TEXT)
-- 2. Convert contact/contacts from TEXT to JSONB array of {value, label?} objects

-- Step 1: Add name_expanded column
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS name_expanded TEXT;

-- Step 2: Check if 'contacts' column exists (TEXT type) and rename/convert it
-- The original schema used 'contacts TEXT', we need to convert to JSONB array
DO $$
BEGIN
    -- Check if contacts column exists as TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'contacts'
        AND data_type = 'text'
    ) THEN
        -- Add new JSONB column
        ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contacts_new JSONB DEFAULT '[]'::jsonb;

        -- Migrate existing contact data to new format
        UPDATE public.organizations
        SET contacts_new =
            CASE
                WHEN contacts IS NOT NULL AND contacts != '' THEN
                    jsonb_build_array(jsonb_build_object('value', contacts))
                ELSE '[]'::jsonb
            END;

        -- Drop old column and rename new one
        ALTER TABLE public.organizations DROP COLUMN contacts;
        ALTER TABLE public.organizations RENAME COLUMN contacts_new TO contacts;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'contact'
    ) THEN
        -- If it's named 'contact' instead
        ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;

        -- Migrate existing contact data to new format
        UPDATE public.organizations
        SET contacts =
            CASE
                WHEN contact IS NOT NULL AND contact != '' THEN
                    jsonb_build_array(jsonb_build_object('value', contact))
                ELSE '[]'::jsonb
            END;

        -- Drop old column
        ALTER TABLE public.organizations DROP COLUMN contact;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
        AND column_name = 'contacts'
    ) THEN
        -- If no contact/contacts column exists, create contacts as JSONB
        ALTER TABLE public.organizations ADD COLUMN contacts JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.organizations.name_expanded IS 'Full/expanded organization name (e.g., IBM -> International Business Machines)';
COMMENT ON COLUMN public.organizations.contacts IS 'Array of contact objects: [{value: string, label?: string}]';
