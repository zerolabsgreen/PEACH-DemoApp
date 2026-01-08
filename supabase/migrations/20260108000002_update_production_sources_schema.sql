-- Migration: Update ProductionSource schema
-- Changes:
-- 1. Convert technology from TEXT to TEXT[] (array)
-- 2. Add eac_types column as eac_type_enum[]
-- 3. Add labels column as TEXT[]
-- 4. Add operation_start_date column as DATE

-- Step 0: Drop dependent views first
DROP VIEW IF EXISTS public.production_source_with_documents CASCADE;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source CASCADE;
DROP VIEW IF EXISTS public.ea_certificate_with_documents CASCADE;
DROP VIEW IF EXISTS public.ea_event_with_documents CASCADE;

-- Step 1: Add new columns
ALTER TABLE public.production_sources
ADD COLUMN IF NOT EXISTS technology_new TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS eac_types public.eac_type_enum[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS operation_start_date DATE;

-- Step 2: Migrate existing technology data (single value to array)
UPDATE public.production_sources
SET technology_new = ARRAY[technology]
WHERE technology IS NOT NULL AND technology != '';

-- Step 3: Drop old technology column and rename new one
ALTER TABLE public.production_sources DROP COLUMN technology;
ALTER TABLE public.production_sources RENAME COLUMN technology_new TO technology;

-- Step 4: Make technology required (NOT NULL with empty array default)
ALTER TABLE public.production_sources
ALTER COLUMN technology SET NOT NULL,
ALTER COLUMN technology SET DEFAULT '{}';

-- Step 5: Drop old index and create new GIN indexes for array columns
DROP INDEX IF EXISTS idx_production_sources_technology;
CREATE INDEX IF NOT EXISTS idx_production_sources_technology ON public.production_sources USING GIN(technology);
CREATE INDEX IF NOT EXISTS idx_production_sources_eac_types ON public.production_sources USING GIN(eac_types);
CREATE INDEX IF NOT EXISTS idx_production_sources_labels ON public.production_sources USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_production_sources_operation_start_date ON public.production_sources(operation_start_date);

-- Step 6: Update validation trigger to handle technology as array
CREATE OR REPLACE FUNCTION public.validate_productionsource_json()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate location is present and is an object
    IF NOT (NEW.location IS NOT NULL AND jsonb_typeof(NEW.location) = 'object') THEN
        RAISE EXCEPTION 'ProductionSource must have a valid location object';
    END IF;

    -- Validate technology array has at least one element
    IF NEW.technology IS NULL OR array_length(NEW.technology, 1) IS NULL OR array_length(NEW.technology, 1) = 0 THEN
        RAISE EXCEPTION 'ProductionSource must have at least one technology';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN public.production_sources.technology IS 'Array of technology types (e.g., Solar, Wind, Hydro). At least one required.';
COMMENT ON COLUMN public.production_sources.eac_types IS 'Array of EAC types this production source can generate (REC, RTC, RNG, SAF, CC).';
COMMENT ON COLUMN public.production_sources.labels IS 'Array of certification/standard labels (e.g., Green-e, ISCC, RSB).';
COMMENT ON COLUMN public.production_sources.operation_start_date IS 'Date when the production source started operating (ISO YYYY-MM-DD).';

-- Temporarily recreate views (will be fully updated in migration 7)
CREATE OR REPLACE VIEW public.production_source_with_documents AS
SELECT
    ps.id,
    ps.external_ids,
    ps.related_production_sources,
    ps.name,
    ps.description,
    ps.location,
    ps.organizations,
    ps.links,
    ps.technology,
    ps.eac_types,
    ps.labels,
    ps.operation_start_date,
    ps.events,
    ps.metadata,
    ps.owner_id,
    ps.created_at,
    ps.updated_at,
    COALESCE(
        (
            SELECT json_agg(d.* ORDER BY d.created_at)
            FROM public.documents d
            WHERE d.id = ANY(ps.documents)
        ), '[]'::json
    ) as documents
FROM public.production_sources ps;

CREATE OR REPLACE VIEW public.ea_certificate_with_documents AS
SELECT
    ec.id,
    ec.type,
    ec.type2,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.organizations,
    ec.links,
    ec.production_source_id,
    ec.production_tech,
    ec.owner_id,
    ec.created_at,
    ec.updated_at,
    COALESCE(
        (
            SELECT json_agg(d.* ORDER BY d.created_at)
            FROM public.documents d
            WHERE d.id = ANY(ec.documents)
        ), '[]'::json
    ) as documents,
    COALESCE(
        (
            SELECT json_agg(e.* ORDER BY e.created_at)
            FROM public.events e
            WHERE e.id = ANY(ec.events)
        ), '[]'::json
    ) as events
FROM public.eacertificates ec;

CREATE OR REPLACE VIEW public.ea_certificate_with_production_source AS
SELECT
    ec.id,
    ec.type,
    ec.type2,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.organizations,
    ec.links,
    ec.documents,
    ec.events,
    ec.production_tech,
    ec.owner_id,
    ec.created_at,
    ec.updated_at,
    jsonb_build_object(
        'id', ps.id,
        'external_ids', ps.external_ids,
        'related_production_sources', ps.related_production_sources,
        'name', ps.name,
        'description', ps.description,
        'location', ps.location,
        'technology', ps.technology,
        'eac_types', ps.eac_types,
        'labels', ps.labels,
        'operation_start_date', ps.operation_start_date
    ) as production_source
FROM public.eacertificates ec
LEFT JOIN public.production_sources ps ON ps.id = ec.production_source_id;

CREATE OR REPLACE VIEW public.ea_event_with_documents AS
SELECT
    ee.id,
    ee.target,
    ee.target_id,
    ee.type,
    ee.value,
    ee.description,
    ee.dates,
    ee.location,
    ee.organizations,
    ee.metadata,
    ee.notes,
    ee.links,
    ee.owner_id,
    ee.created_at,
    ee.updated_at,
    COALESCE(
        (
            SELECT json_agg(d.* ORDER BY d.created_at)
            FROM public.documents d
            WHERE d.id = ANY(ee.documents)
        ), '[]'::json
    ) as documents
FROM public.events ee;

-- Grant permissions on views
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated;
GRANT SELECT ON public.ea_certificate_with_production_source TO anon;
GRANT SELECT ON public.ea_event_with_documents TO authenticated;
GRANT SELECT ON public.ea_event_with_documents TO anon;
