-- Migration: Remove description from events (use notes instead) and organizations from eacertificates (belong to events)
-- Per canonical schema: https://github.com/zerolabsgreen/PEACH-DataModel/blob/master/src/entities/EACEvent.ts

-- Drop views that depend on these columns
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source;
DROP VIEW IF EXISTS public.ea_event_with_documents;

-- Remove columns
ALTER TABLE public.events DROP COLUMN IF EXISTS description;
ALTER TABLE public.eacertificates DROP COLUMN IF EXISTS organizations;

-- Recreate views without removed columns

CREATE VIEW public.ea_certificate_with_documents
WITH (security_invoker = on) AS
SELECT
    ec.id,
    ec.type,
    ec.type2,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.links,
    ec.related_certificates,
    ec.metadata,
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

CREATE VIEW public.ea_certificate_with_production_source
WITH (security_invoker = on) AS
SELECT
    ec.id,
    ec.type,
    ec.type2,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.links,
    ec.related_certificates,
    ec.metadata,
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

CREATE VIEW public.ea_event_with_documents
WITH (security_invoker = on) AS
SELECT
    ee.id,
    ee.target,
    ee.target_id,
    ee.type,
    ee.value,
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
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated, anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated, anon;
GRANT SELECT ON public.ea_event_with_documents TO authenticated, anon;
