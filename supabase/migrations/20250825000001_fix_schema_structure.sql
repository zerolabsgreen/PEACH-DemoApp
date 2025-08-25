-- Fix Database Schema Structure Migration
-- Created: 2025-08-25
-- This migration fixes the schema structure to match the intended TypeScript interfaces

-- 0. Drop existing views that depend on columns we're about to modify
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
DROP VIEW IF EXISTS public.ea_event_with_documents;
DROP VIEW IF EXISTS public.production_source_with_documents;

-- 1. Remove doc_id from documents table (redundant with primary key)
ALTER TABLE public.documents DROP COLUMN IF EXISTS doc_id;

-- 2. Fix Events table - convert documents to UUID array and organizations to proper array structure
ALTER TABLE public.events 
    DROP COLUMN IF EXISTS documents,
    DROP COLUMN IF EXISTS organizations;

ALTER TABLE public.events 
    ADD COLUMN documents UUID[] DEFAULT '{}',
    ADD COLUMN organizations JSONB DEFAULT '[]'::jsonb;

-- 3. Fix Organizations table - convert documents to UUID array, external_ids to array, rename contacts
ALTER TABLE public.organizations 
    DROP COLUMN IF EXISTS documents,
    DROP COLUMN IF EXISTS external_ids;

ALTER TABLE public.organizations 
    ADD COLUMN documents UUID[] DEFAULT '{}',
    ADD COLUMN external_ids JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.organizations RENAME COLUMN contacts TO contact;

-- 4. Fix Production Sources table - convert documents and events to UUID arrays, fix other array fields
ALTER TABLE public.production_sources 
    DROP COLUMN IF EXISTS documents,
    DROP COLUMN IF EXISTS events,
    DROP COLUMN IF EXISTS external_ids,
    DROP COLUMN IF EXISTS related_production_sources_ids,
    DROP COLUMN IF EXISTS organizations,
    DROP COLUMN IF EXISTS metadata;

ALTER TABLE public.production_sources 
    ADD COLUMN documents UUID[] DEFAULT '{}',
    ADD COLUMN events UUID[] DEFAULT '{}',
    ADD COLUMN external_ids JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN related_production_sources JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN organizations JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN metadata JSONB DEFAULT '[]'::jsonb;

-- 5. Fix EACertificates table - add missing events field, fix external_ids, add production_source_id
ALTER TABLE public.eacertificates 
    DROP COLUMN IF EXISTS external_ids,
    DROP COLUMN IF EXISTS documents;

ALTER TABLE public.eacertificates 
    ADD COLUMN external_ids JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN documents UUID[] DEFAULT '{}',
    ADD COLUMN events UUID[] DEFAULT '{}',
    ADD COLUMN production_source_id UUID REFERENCES public.production_sources(id) ON DELETE SET NULL;

-- 6. Update indexes to reflect new structure
DROP INDEX IF EXISTS idx_documents_doc_id;
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);

-- Create GIN indexes for array columns to improve performance
CREATE INDEX IF NOT EXISTS idx_events_documents ON public.events USING GIN(documents);
CREATE INDEX IF NOT EXISTS idx_organizations_documents ON public.organizations USING GIN(documents);
CREATE INDEX IF NOT EXISTS idx_production_sources_documents ON public.production_sources USING GIN(documents);
CREATE INDEX IF NOT EXISTS idx_production_sources_events ON public.production_sources USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_eacertificates_documents ON public.eacertificates USING GIN(documents);
CREATE INDEX IF NOT EXISTS idx_eacertificates_events ON public.eacertificates USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_eacertificates_production_source ON public.eacertificates(production_source_id);

-- 7. Update validation functions to work with new structure
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

-- 8. Recreate views to work with new structure
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

CREATE OR REPLACE VIEW public.ea_event_with_documents AS
SELECT 
    ee.id,
    ee.target,
    ee.target_id,
    ee.type,
    ee.description,
    ee.dates,
    ee.location,
    ee.organizations,
    ee.notes,
    ee.links,
    ee.created_at,
    ee.updated_at,
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
FROM public.events ee
LEFT JOIN public.documents d ON d.id = ANY(ee.documents)
GROUP BY ee.id, ee.target, ee.target_id, ee.type, ee.description, ee.dates, ee.location, ee.organizations, ee.notes, ee.links, ee.created_at, ee.updated_at;

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

-- 9. Create new view for EACertificates with production source details
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

-- 10. Grant permissions on all views
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_event_with_documents TO authenticated;
GRANT SELECT ON public.ea_event_with_documents TO anon;
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated;
GRANT SELECT ON public.ea_certificate_with_production_source TO anon;

-- 11. Add comments to document the new structure
COMMENT ON COLUMN public.documents.id IS 'Primary key UUID for the document';
COMMENT ON COLUMN public.events.documents IS 'Array of document UUIDs that are related to this event';
COMMENT ON COLUMN public.events.organizations IS 'Array of organization role objects with orgId, role, and orgName';
COMMENT ON COLUMN public.organizations.documents IS 'Array of document UUIDs that are related to this organization';
COMMENT ON COLUMN public.organizations.external_ids IS 'Array of external ID objects with id, ownerOrgId, ownerOrgName, description, externalFieldName';
COMMENT ON COLUMN public.organizations.contact IS 'Contact information for the organization (singular)';
COMMENT ON COLUMN public.production_sources.documents IS 'Array of document UUIDs that are related to this production source';
COMMENT ON COLUMN public.production_sources.events IS 'Array of event UUIDs that are related to this production source';
COMMENT ON COLUMN public.production_sources.external_ids IS 'Array of external ID objects';
COMMENT ON COLUMN public.production_sources.related_production_sources IS 'Array of related production source objects';
COMMENT ON COLUMN public.production_sources.organizations IS 'Array of organization role objects';
COMMENT ON COLUMN public.production_sources.metadata IS 'Array of metadata item objects with key, label, value, type, required, description';
COMMENT ON COLUMN public.eacertificates.documents IS 'Array of document UUIDs that are related to this EACertificate';
COMMENT ON COLUMN public.eacertificates.events IS 'Array of event UUIDs that are related to this EACertificate';
COMMENT ON COLUMN public.eacertificates.production_source_id IS 'Reference to the production source that generated this EACertificate';
COMMENT ON COLUMN public.eacertificates.external_ids IS 'Array of external ID objects';

-- 12. Create trigger to validate UUID arrays in events table
CREATE OR REPLACE FUNCTION public.validate_event_arrays()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate documents array contains valid UUIDs
    IF NEW.documents IS NOT NULL AND array_length(NEW.documents, 1) > 0 THEN
        IF EXISTS (
            SELECT 1 FROM unnest(NEW.documents) AS doc_id
            WHERE NOT EXISTS (SELECT 1 FROM public.documents WHERE id = doc_id)
        ) THEN
            RAISE EXCEPTION 'All document UUIDs must reference existing documents';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_event_arrays_trigger
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.validate_event_arrays();

-- 13. Create trigger to validate UUID arrays in organizations table
CREATE OR REPLACE FUNCTION public.validate_organization_arrays()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate documents array contains valid UUIDs
    IF NEW.documents IS NOT NULL AND array_length(NEW.documents, 1) > 0 THEN
        IF EXISTS (
            SELECT 1 FROM unnest(NEW.documents) AS doc_id
            WHERE NOT EXISTS (SELECT 1 FROM public.documents WHERE id = doc_id)
        ) THEN
            RAISE EXCEPTION 'All document UUIDs must reference existing documents';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_organization_arrays_trigger
    BEFORE INSERT OR UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.validate_organization_arrays();

-- 14. Create trigger to validate UUID arrays in production_sources table
CREATE OR REPLACE FUNCTION public.validate_productionsource_arrays()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate documents array contains valid UUIDs
    IF NEW.documents IS NOT NULL AND array_length(NEW.documents, 1) > 0 THEN
        IF EXISTS (
            SELECT 1 FROM unnest(NEW.documents) AS doc_id
            WHERE NOT EXISTS (SELECT 1 FROM public.documents WHERE id = doc_id)
        ) THEN
            RAISE EXCEPTION 'All document UUIDs must reference existing documents';
        END IF;
    END IF;
    
    -- Validate events array contains valid UUIDs
    IF NEW.events IS NOT NULL AND array_length(NEW.events, 1) > 0 THEN
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

CREATE TRIGGER validate_productionsource_arrays_trigger
    BEFORE INSERT OR UPDATE ON public.production_sources
    FOR EACH ROW EXECUTE FUNCTION public.validate_productionsource_arrays();

-- Migration completed successfully
