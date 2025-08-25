-- Fix Remaining Database Schema Issues Migration
-- Created: 2025-08-25
-- This migration fixes the remaining schema issues that weren't addressed in the first migration

-- 0. Drop existing views that depend on columns we're about to modify
DROP VIEW IF EXISTS public.production_source_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source;

-- 1. Fix Organizations table - fix location field to be array of objects
ALTER TABLE public.organizations 
    DROP COLUMN IF EXISTS location;

ALTER TABLE public.organizations 
    ADD COLUMN location JSONB DEFAULT '[]'::jsonb;

-- 2. Fix Production Sources table - fix events to be array of objects (not UUIDs)
ALTER TABLE public.production_sources 
    DROP COLUMN IF EXISTS events;

ALTER TABLE public.production_sources 
    ADD COLUMN events JSONB DEFAULT '[]'::jsonb;

-- 3. Fix EACertificates table - fix amounts and emissions to be arrays of objects
ALTER TABLE public.eacertificates 
    DROP COLUMN IF EXISTS amounts,
    DROP COLUMN IF EXISTS emissions;

ALTER TABLE public.eacertificates 
    ADD COLUMN amounts JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN emissions JSONB DEFAULT '[]'::jsonb;

-- 4. Recreate the views that were dropped
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
    ps.events,
    ps.metadata,
    ps.created_at,
    ps.updated_at,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'id', d.id,
                'url', d.url,
                'fileType', d.file_type,
                'title', d.title,
                'description', d.description
            )
        ) FILTER (WHERE d.id IS NOT NULL), 
        '[]'::json
    ) as documents
FROM public.production_sources ps
LEFT JOIN public.documents d ON d.id = ANY(ps.documents)
GROUP BY ps.id, ps.external_ids, ps.related_production_sources, ps.name, ps.description, ps.location, ps.organizations, ps.links, ps.technology, ps.events, ps.metadata, ps.created_at, ps.updated_at;

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
        json_agg(
            jsonb_build_object(
                'id', d.id,
                'url', d.url,
                'fileType', d.file_type,
                'title', d.title,
                'description', d.description
            )
        ) FILTER (WHERE d.id IS NOT NULL), 
        '[]'::json
    ) as documents,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'id', e.id,
                'target', e.target,
                'type', e.type,
                'description', e.description
            )
        ) FILTER (WHERE e.id IS NOT NULL), 
        '[]'::json
    ) as events
FROM public.eacertificates ec
LEFT JOIN public.documents d ON d.id = ANY(ec.documents)
LEFT JOIN public.events e ON e.id = ANY(ec.events)
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
        'name', ps.name,
        'description', ps.description,
        'technology', ps.technology,
        'location', ps.location
    ) as production_source
FROM public.eacertificates ec
LEFT JOIN public.production_sources ps ON ps.id = ec.production_source_id;

-- 5. Grant permissions on all the recreated views
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated;
GRANT SELECT ON public.ea_certificate_with_production_source TO anon;

-- 6. Update comments to document the corrected structure
COMMENT ON COLUMN public.organizations.location IS 'Array of location objects with city, state, country, address, postalCode';
COMMENT ON COLUMN public.production_sources.events IS 'Array of event objects (not UUIDs) with full event data';
COMMENT ON COLUMN public.eacertificates.amounts IS 'Array of amount objects with amount, unit, conversionFactor, conversionNotes, isPrimary';
COMMENT ON COLUMN public.eacertificates.emissions IS 'Array of emissions data objects with carbonIntensity, ciUnit, ciNotes, emissionsFactor, efUnit, efNotes';

-- 7. Update validation function to work with new amounts and emissions structure
DROP TRIGGER IF EXISTS validate_eacertificate_json_trigger ON public.eacertificates;
DROP FUNCTION IF EXISTS public.validate_eacertificate_json();

CREATE OR REPLACE FUNCTION public.validate_eacertificate_json()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate amounts array is not empty
    IF jsonb_array_length(NEW.amounts) = 0 THEN
        RAISE EXCEPTION 'EACertificate must have at least one amount';
    END IF;
    
    -- Validate amounts structure
    IF NOT (NEW.amounts @> '[{"amount": 0, "unit": ""}]') THEN
        RAISE EXCEPTION 'Amounts must have amount and unit fields';
    END IF;
    
    -- Validate documents array contains valid UUIDs
    IF NEW.documents IS NOT NULL AND array_length(NEW.documents, 1) > 0 THEN
        -- Check if all document UUIDs exist in documents table
        IF EXISTS (
            SELECT 1 FROM unnest(NEW.documents) AS doc_id
            WHERE NOT EXISTS (SELECT 1 FROM public.documents WHERE id = doc_id)
        ) THEN
            RAISE EXCEPTION 'All document UUIDs must reference existing documents';
        END IF;
    END IF;
    
    -- Validate events array contains valid UUIDs
    IF NEW.events IS NOT NULL AND array_length(NEW.events, 1) > 0 THEN
        -- Check if all event UUIDs exist in events table
        IF EXISTS (
            SELECT 1 FROM unnest(NEW.events) AS event_id
            WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE id = event_id)
        ) THEN
            RAISE EXCEPTION 'All event UUIDs must reference existing events';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER validate_eacertificate_json_trigger
    BEFORE INSERT OR UPDATE ON public.eacertificates
    FOR EACH ROW EXECUTE FUNCTION public.validate_eacertificate_json();

-- Migration completed successfully
