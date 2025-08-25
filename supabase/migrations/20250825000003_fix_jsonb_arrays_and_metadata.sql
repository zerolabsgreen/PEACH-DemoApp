-- Fix JSONB Arrays and Metadata Migration
-- Created: 2025-08-25
-- This migration fixes JSONB fields that should be arrays and adds missing metadata array fields

-- 0. Drop existing views that depend on columns we're about to modify
DROP VIEW IF EXISTS public.production_source_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source;

-- 1. Fix Organizations table - convert external_ids and location to proper JSONB arrays
ALTER TABLE public.organizations 
    DROP COLUMN IF EXISTS external_ids,
    DROP COLUMN IF EXISTS location;

ALTER TABLE public.organizations 
    ADD COLUMN external_ids JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN location JSONB DEFAULT '[]'::jsonb;

-- 2. Fix Production Sources table - convert events, external_ids, related_production_sources, organizations, metadata to proper JSONB arrays
ALTER TABLE public.production_sources 
    DROP COLUMN IF EXISTS events,
    DROP COLUMN IF EXISTS external_ids,
    DROP COLUMN IF EXISTS related_production_sources,
    DROP COLUMN IF EXISTS organizations,
    DROP COLUMN IF EXISTS metadata;

ALTER TABLE public.production_sources 
    ADD COLUMN events JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN external_ids JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN related_production_sources JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN organizations JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN metadata JSONB DEFAULT '[]'::jsonb;

-- 3. Fix EACertificates table - convert external_ids, amounts, emissions to proper JSONB arrays
ALTER TABLE public.eacertificates 
    DROP COLUMN IF EXISTS external_ids,
    DROP COLUMN IF EXISTS amounts,
    DROP COLUMN IF EXISTS emissions;

ALTER TABLE public.eacertificates 
    ADD COLUMN external_ids JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN amounts JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN emissions JSONB DEFAULT '[]'::jsonb;

-- 4. Add missing metadata field to Documents table (was missing entirely)
ALTER TABLE public.documents 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '[]'::jsonb;

-- 5. Add missing metadata field to Events table (was missing entirely)
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '[]'::jsonb;

-- 6. Add missing metadata field to Organizations table (was missing entirely)
ALTER TABLE public.organizations 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '[]'::jsonb;

-- 7. Recreate all the views that were dropped
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

-- 8. Grant permissions on all the recreated views
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated;
GRANT SELECT ON public.ea_certificate_with_production_source TO anon;

-- 9. Update comments to document the corrected structure
COMMENT ON COLUMN public.organizations.external_ids IS 'Array of external ID objects with id, ownerOrgId, ownerOrgName, description, externalFieldName';
COMMENT ON COLUMN public.organizations.location IS 'Array of location objects with city, state, country, address, postalCode';
COMMENT ON COLUMN public.organizations.metadata IS 'Array of metadata item objects with key, label, value, type, required, description';
COMMENT ON COLUMN public.production_sources.events IS 'Array of event objects (not UUIDs) with full event data';
COMMENT ON COLUMN public.production_sources.external_ids IS 'Array of external ID objects';
COMMENT ON COLUMN public.production_sources.related_production_sources IS 'Array of related production source objects';
COMMENT ON COLUMN public.production_sources.organizations IS 'Array of organization role objects';
COMMENT ON COLUMN public.production_sources.metadata IS 'Array of metadata item objects with key, label, value, type, required, description';
COMMENT ON COLUMN public.eacertificates.external_ids IS 'Array of external ID objects';
COMMENT ON COLUMN public.eacertificates.amounts IS 'Array of amount objects with amount, unit, conversionFactor, conversionNotes, isPrimary';
COMMENT ON COLUMN public.eacertificates.emissions IS 'Array of emissions data objects with carbonIntensity, ciUnit, ciNotes, emissionsFactor, efUnit, efNotes';
COMMENT ON COLUMN public.documents.metadata IS 'Array of metadata item objects with key, label, value, type, required, description';
COMMENT ON COLUMN public.events.metadata IS 'Array of metadata item objects with key, label, value, type, required, description';

-- Migration completed successfully
