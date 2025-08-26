-- Convert remaining JSONB fields to jsonb[] and Production Sources events to uuid[]
-- 1. Documents: metadata, organizations -> jsonb[]
-- 2. Organizations: external_ids, metadata -> jsonb[]
-- 3. Events: organizations, metadata -> jsonb[]
-- 4. Production Sources: external_ids, related_production_sources, organizations, metadata -> jsonb[]
-- 5. Production Sources: events -> uuid[] referencing public.events(id)

BEGIN;

-- Drop dependent views first
DROP VIEW IF EXISTS public.production_source_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source;
DROP VIEW IF EXISTS public.ea_event_with_documents;

-- 1) Documents: convert metadata, organizations to jsonb[]
ALTER TABLE public.documents 
    RENAME COLUMN metadata TO metadata_json;
ALTER TABLE public.documents 
    RENAME COLUMN organizations TO organizations_json;

ALTER TABLE public.documents 
    ADD COLUMN metadata jsonb[] DEFAULT '{}'::jsonb[],
    ADD COLUMN organizations jsonb[] DEFAULT '{}'::jsonb[];

UPDATE public.documents d
SET 
    metadata = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(d.metadata_json) = 'array' THEN d.metadata_json WHEN d.metadata_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(d.metadata_json) END) AS t(elem)
    ) s), '{}'::jsonb[]),
    organizations = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(d.organizations_json) = 'array' THEN d.organizations_json WHEN d.organizations_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(d.organizations_json) END) AS t(elem)
    ) s), '{}'::jsonb[]);

ALTER TABLE public.documents 
    DROP COLUMN IF EXISTS metadata_json,
    DROP COLUMN IF EXISTS organizations_json;

-- 2) Organizations: convert external_ids, metadata to jsonb[]
ALTER TABLE public.organizations 
    RENAME COLUMN external_ids TO external_ids_json;
ALTER TABLE public.organizations 
    RENAME COLUMN metadata TO metadata_json;

ALTER TABLE public.organizations 
    ADD COLUMN external_ids jsonb[] DEFAULT '{}'::jsonb[],
    ADD COLUMN metadata jsonb[] DEFAULT '{}'::jsonb[];

UPDATE public.organizations o
SET 
    external_ids = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.external_ids_json) = 'array' THEN o.external_ids_json WHEN o.external_ids_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(o.external_ids_json) END) AS t(elem)
    ) s), '{}'::jsonb[]),
    metadata = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.metadata_json) = 'array' THEN o.metadata_json WHEN o.metadata_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(o.metadata_json) END) AS t(elem)
    ) s), '{}'::jsonb[]);

ALTER TABLE public.organizations 
    DROP COLUMN IF EXISTS external_ids_json,
    DROP COLUMN IF EXISTS metadata_json;

-- 3) Events: convert organizations, metadata to jsonb[]
ALTER TABLE public.events 
    RENAME COLUMN organizations TO organizations_json;
ALTER TABLE public.events 
    RENAME COLUMN metadata TO metadata_json;

ALTER TABLE public.events 
    ADD COLUMN organizations jsonb[] DEFAULT '{}'::jsonb[],
    ADD COLUMN metadata jsonb[] DEFAULT '{}'::jsonb[];

UPDATE public.events e
SET 
    organizations = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(e.organizations_json) = 'array' THEN e.organizations_json WHEN e.organizations_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(e.organizations_json) END) AS t(elem)
    ) s), '{}'::jsonb[]),
    metadata = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(e.metadata_json) = 'array' THEN e.metadata_json WHEN e.metadata_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(e.metadata_json) END) AS t(elem)
    ) s), '{}'::jsonb[]);

ALTER TABLE public.events 
    DROP COLUMN IF EXISTS organizations_json,
    DROP COLUMN IF EXISTS metadata_json;

-- 4) Production Sources: convert jsonb group to jsonb[]
ALTER TABLE public.production_sources 
    RENAME COLUMN external_ids TO external_ids_json;
ALTER TABLE public.production_sources 
    RENAME COLUMN related_production_sources TO related_production_sources_json;
ALTER TABLE public.production_sources 
    RENAME COLUMN organizations TO organizations_json;
ALTER TABLE public.production_sources 
    RENAME COLUMN metadata TO metadata_json;

ALTER TABLE public.production_sources 
    ADD COLUMN external_ids jsonb[] DEFAULT '{}'::jsonb[],
    ADD COLUMN related_production_sources jsonb[] DEFAULT '{}'::jsonb[],
    ADD COLUMN organizations jsonb[] DEFAULT '{}'::jsonb[],
    ADD COLUMN metadata jsonb[] DEFAULT '{}'::jsonb[];

UPDATE public.production_sources ps
SET 
    external_ids = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ps.external_ids_json) = 'array' THEN ps.external_ids_json WHEN ps.external_ids_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(ps.external_ids_json) END) AS t(elem)
    ) s), '{}'::jsonb[]),
    related_production_sources = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ps.related_production_sources_json) = 'array' THEN ps.related_production_sources_json WHEN ps.related_production_sources_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(ps.related_production_sources_json) END) AS t(elem)
    ) s), '{}'::jsonb[]),
    organizations = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ps.organizations_json) = 'array' THEN ps.organizations_json WHEN ps.organizations_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(ps.organizations_json) END) AS t(elem)
    ) s), '{}'::jsonb[]),
    metadata = COALESCE((SELECT ARRAY_AGG(elem) FROM (
        SELECT elem FROM jsonb_array_elements(CASE WHEN jsonb_typeof(ps.metadata_json) = 'array' THEN ps.metadata_json WHEN ps.metadata_json IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(ps.metadata_json) END) AS t(elem)
    ) s), '{}'::jsonb[]);

ALTER TABLE public.production_sources 
    DROP COLUMN IF EXISTS external_ids_json,
    DROP COLUMN IF EXISTS related_production_sources_json,
    DROP COLUMN IF EXISTS organizations_json,
    DROP COLUMN IF EXISTS metadata_json;

-- 5) Production Sources: convert events JSONB to UUID[] of event ids
-- First, rename current events column to events_json to preserve data
ALTER TABLE public.production_sources 
    RENAME COLUMN events TO events_json;

-- Create new UUID[] events column
ALTER TABLE public.production_sources 
    ADD COLUMN events UUID[] DEFAULT '{}'::uuid[];

-- Backfill: if events_json is an array of objects that contain id, extract id; if array of UUIDs, coerce; else empty
UPDATE public.production_sources ps
SET events = COALESCE(
    (
        SELECT ARRAY(
            SELECT DISTINCT e_id
            FROM (
                SELECT CASE 
                    WHEN jsonb_typeof(elem) = 'object' AND (elem ? 'id') THEN (elem->>'id')::uuid
                    WHEN jsonb_typeof(elem) = 'string' THEN (elem #>> '{}')::uuid
                    ELSE NULL::uuid
                END AS e_id
                FROM jsonb_array_elements(CASE 
                    WHEN jsonb_typeof(ps.events_json) = 'array' THEN ps.events_json
                    WHEN ps.events_json IS NULL THEN '[]'::jsonb
                    ELSE jsonb_build_array(ps.events_json)
                END) AS t(elem)
            ) s
            WHERE e_id IS NOT NULL
        )
    ), '{}'::uuid[]
);

-- Drop old json column
ALTER TABLE public.production_sources 
    DROP COLUMN IF EXISTS events_json;

-- Recreate dependent views to reflect new structures
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

-- Recreate ea_event_with_documents view
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
    ee.metadata,
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
GROUP BY ee.id, ee.target, ee.target_id, ee.type, ee.description, ee.dates, ee.location, ee.organizations, ee.metadata, ee.notes, ee.links, ee.created_at, ee.updated_at;

-- Update comments to document new structures
COMMENT ON COLUMN public.documents.metadata IS 'Array of metadata item objects (jsonb[])';
COMMENT ON COLUMN public.documents.organizations IS 'Array of organization role objects (jsonb[])';
COMMENT ON COLUMN public.organizations.external_ids IS 'Array of external ID objects (jsonb[])';
COMMENT ON COLUMN public.organizations.metadata IS 'Array of metadata item objects (jsonb[])';
COMMENT ON COLUMN public.events.organizations IS 'Array of organization role objects (jsonb[])';
COMMENT ON COLUMN public.events.metadata IS 'Array of metadata item objects (jsonb[])';
COMMENT ON COLUMN public.production_sources.external_ids IS 'Array of external ID objects (jsonb[])';
COMMENT ON COLUMN public.production_sources.related_production_sources IS 'Array of related production source objects (jsonb[])';
COMMENT ON COLUMN public.production_sources.organizations IS 'Array of organization role objects (jsonb[])';
COMMENT ON COLUMN public.production_sources.metadata IS 'Array of metadata item objects (jsonb[])';
COMMENT ON COLUMN public.production_sources.events IS 'Array of UUIDs referencing events that happened to the source';

-- Restore grants on views
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated;
GRANT SELECT ON public.ea_certificate_with_production_source TO anon;
GRANT SELECT ON public.ea_event_with_documents TO authenticated;
GRANT SELECT ON public.ea_event_with_documents TO anon;

COMMIT;


