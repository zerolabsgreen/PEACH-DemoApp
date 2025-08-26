-- Convert EACertificates JSONB columns (external_ids, amounts, emissions) to jsonb[]
-- Strategy: rename old columns, add new jsonb[] columns, backfill by expanding JSON arrays,
-- update dependent trigger, comments, and views, then drop old columns.

BEGIN;

-- 1) Drop dependent views to avoid dependency errors
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source;

-- 2) Rename old columns to keep data
ALTER TABLE public.eacertificates 
    RENAME COLUMN external_ids TO external_ids_json;
ALTER TABLE public.eacertificates 
    RENAME COLUMN amounts TO amounts_json;
ALTER TABLE public.eacertificates 
    RENAME COLUMN emissions TO emissions_json;

-- 3) Add new columns with desired type jsonb[]
ALTER TABLE public.eacertificates 
    ADD COLUMN external_ids jsonb[] DEFAULT '{}'::jsonb[] NOT NULL,
    ADD COLUMN amounts jsonb[] DEFAULT '{}'::jsonb[] NOT NULL,
    ADD COLUMN emissions jsonb[] DEFAULT '{}'::jsonb[];

-- 4) Backfill data from JSON arrays into jsonb[]
-- Handle NULLs and ensure only JSON arrays are expanded. Non-arrays will be wrapped if present.
UPDATE public.eacertificates ec
SET 
    external_ids = COALESCE(
        (
            SELECT ARRAY_AGG(elem) 
            FROM (
                SELECT elem
                FROM jsonb_array_elements(CASE 
                    WHEN jsonb_typeof(ec.external_ids_json) = 'array' THEN ec.external_ids_json
                    WHEN ec.external_ids_json IS NULL THEN '[]'::jsonb
                    ELSE jsonb_build_array(ec.external_ids_json)
                END) AS t(elem)
            ) s
        ), '{}'::jsonb[]
    ),
    amounts = COALESCE(
        (
            SELECT ARRAY_AGG(elem) 
            FROM (
                SELECT elem
                FROM jsonb_array_elements(CASE 
                    WHEN jsonb_typeof(ec.amounts_json) = 'array' THEN ec.amounts_json
                    WHEN ec.amounts_json IS NULL THEN '[]'::jsonb
                    ELSE jsonb_build_array(ec.amounts_json)
                END) AS t(elem)
            ) s
        ), '{}'::jsonb[]
    ),
    emissions = COALESCE(
        (
            SELECT ARRAY_AGG(elem) 
            FROM (
                SELECT elem
                FROM jsonb_array_elements(CASE 
                    WHEN jsonb_typeof(ec.emissions_json) = 'array' THEN ec.emissions_json
                    WHEN ec.emissions_json IS NULL THEN '[]'::jsonb
                    ELSE jsonb_build_array(ec.emissions_json)
                END) AS t(elem)
            ) s
        ), '{}'::jsonb[]
    );

-- 5) Update comments to reflect jsonb[] types
COMMENT ON COLUMN public.eacertificates.external_ids IS 'Array of external ID objects (jsonb[])';
COMMENT ON COLUMN public.eacertificates.amounts IS 'Array of amount objects (jsonb[]) with amount, unit, conversionFactor, conversionNotes, isPrimary';
COMMENT ON COLUMN public.eacertificates.emissions IS 'Array of emissions data objects (jsonb[]) with carbonIntensity, ciUnit, ciNotes, emissionsFactor, efUnit, efNotes';

-- 6) Drop existing validation trigger/function; will recreate adapted to jsonb[]
DROP TRIGGER IF EXISTS validate_eacertificate_json_trigger ON public.eacertificates;
DROP FUNCTION IF EXISTS public.validate_eacertificate_json();

-- 7) Recreate validation function for jsonb[] columns
CREATE OR REPLACE FUNCTION public.validate_eacertificate_json()
RETURNS TRIGGER AS $$
DECLARE
    amount_count integer;
BEGIN
    -- Validate amounts array is not empty
    SELECT COALESCE(array_length(NEW.amounts, 1), 0) INTO amount_count;
    IF amount_count = 0 THEN
        RAISE EXCEPTION 'EACertificate must have at least one amount';
    END IF;

    -- Optional: basic shape validation on first element (exists amount, unit)
    IF NEW.amounts IS NOT NULL AND array_length(NEW.amounts, 1) > 0 THEN
        IF NOT ((NEW.amounts[1] ? 'amount') AND (NEW.amounts[1] ? 'unit')) THEN
            RAISE EXCEPTION 'Amounts must include amount and unit fields';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_eacertificate_json_trigger
    BEFORE INSERT OR UPDATE ON public.eacertificates
    FOR EACH ROW EXECUTE FUNCTION public.validate_eacertificate_json();

-- 8) Recreate views, adapting any json operations if necessary
-- Note: downstream code previously treated these as JSON arrays; representation in views can still emit JSON arrays.
CREATE OR REPLACE VIEW public.ea_certificate_with_documents AS
SELECT 
    ec.id,
    ec.type,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.links,
    ec.production_source_id,
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
FROM public.eacertificates ec
GROUP BY ec.id, ec.type, ec.external_ids, ec.amounts, ec.emissions, ec.links, ec.production_source_id, ec.created_at, ec.updated_at;

CREATE OR REPLACE VIEW public.ea_certificate_with_production_source AS
SELECT 
    ec.id,
    ec.type,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.links,
    ec.documents,
    ec.events,
    ec.created_at,
    ec.updated_at,
    jsonb_build_object(
        'id', ps.id,
        'external_ids', ps.external_ids,
        'related_production_sources', ps.related_production_sources,
        'name', ps.name,
        'description', ps.description,
        'location', ps.location
    ) as production_source
FROM public.eacertificates ec
LEFT JOIN public.production_sources ps ON ps.id = ec.production_source_id;

-- 9) Drop old json columns
ALTER TABLE public.eacertificates 
    DROP COLUMN IF EXISTS external_ids_json,
    DROP COLUMN IF EXISTS amounts_json,
    DROP COLUMN IF EXISTS emissions_json;

COMMIT;


