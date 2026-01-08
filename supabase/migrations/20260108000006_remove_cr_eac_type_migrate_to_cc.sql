-- Migration: Remove CR from eac_type_enum and migrate existing data
-- CR (Carbon Removal) is now a subtype of CC (Carbon Credit) with type2='Carbon Removal'

-- Step 0: Drop dependent views first
DROP VIEW IF EXISTS public.production_source_with_documents CASCADE;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source CASCADE;
DROP VIEW IF EXISTS public.ea_certificate_with_documents CASCADE;
DROP VIEW IF EXISTS public.ea_event_with_documents CASCADE;

-- Step 1: Update existing CR records to CC with type2='Carbon Removal'
UPDATE public.eacertificates
SET type = 'CC',
    type2 = COALESCE(type2, 'Carbon Removal')
WHERE type = 'CR';

-- Step 2: Update production_sources.eac_types array to replace CR with CC
UPDATE public.production_sources
SET eac_types = (
    SELECT array_agg(DISTINCT
        CASE
            WHEN elem = 'CR' THEN 'CC'::public.eac_type_enum
            ELSE elem
        END
    )
    FROM unnest(eac_types) AS elem
)
WHERE 'CR' = ANY(eac_types::text[]);

-- Step 3: Create new enum without CR
CREATE TYPE public.eac_type_enum_new AS ENUM (
    'REC',
    'RTC',
    'RNG',
    'SAF',
    'CC'
);

-- Step 4: Alter eacertificates.type to TEXT temporarily
ALTER TABLE public.eacertificates
ALTER COLUMN type TYPE TEXT;

-- Step 5: Convert eacertificates.type to new enum
ALTER TABLE public.eacertificates
ALTER COLUMN type TYPE public.eac_type_enum_new USING type::public.eac_type_enum_new;

-- Step 6: Drop default, alter type, restore default for eac_types
ALTER TABLE public.production_sources ALTER COLUMN eac_types DROP DEFAULT;
ALTER TABLE public.production_sources
ALTER COLUMN eac_types TYPE TEXT[];

-- Step 7: Convert production_sources.eac_types to new enum array and restore default
ALTER TABLE public.production_sources
ALTER COLUMN eac_types TYPE public.eac_type_enum_new[] USING eac_types::public.eac_type_enum_new[];
ALTER TABLE public.production_sources ALTER COLUMN eac_types SET DEFAULT '{}'::public.eac_type_enum_new[];

-- Step 8: Drop old enum and rename new one
DROP TYPE public.eac_type_enum;
ALTER TYPE public.eac_type_enum_new RENAME TO eac_type_enum;

-- Step 9: Update seed function if it exists (search and replace CR references)
-- Note: The seed_examples_on_signup function may need manual review if it uses CR

-- Add comment
COMMENT ON TYPE public.eac_type_enum IS 'EAC types: REC (Renewable Energy Certificate), RTC (Renewable Thermal Certificate), RNG (Renewable Natural Gas), SAF (Sustainable Aviation Fuel), CC (Carbon Credit). Carbon Removal is now a subtype of CC (use type2).';
