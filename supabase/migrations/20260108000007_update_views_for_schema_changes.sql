-- Migration: Update views to reflect schema changes
-- Adds new columns to views: related_certificates, metadata (eacertificates), eac_types, labels, operation_start_date (production_sources)

-- Drop existing views
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source;
DROP VIEW IF EXISTS public.production_source_with_documents;
DROP VIEW IF EXISTS public.ea_event_with_documents;

-- Recreate ea_certificate_with_documents view with new columns
CREATE VIEW public.ea_certificate_with_documents
WITH (security_invoker = on) AS
SELECT
    ec.id,
    ec.type,
    ec.type2,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.organizations,
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

-- Recreate ea_certificate_with_production_source view
CREATE VIEW public.ea_certificate_with_production_source
WITH (security_invoker = on) AS
SELECT
    ec.id,
    ec.type,
    ec.type2,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.organizations,
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

-- Recreate production_source_with_documents view with new columns
CREATE VIEW public.production_source_with_documents
WITH (security_invoker = on) AS
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

-- Recreate ea_event_with_documents view (unchanged structure)
CREATE VIEW public.ea_event_with_documents
WITH (security_invoker = on) AS
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
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated;
GRANT SELECT ON public.ea_certificate_with_production_source TO anon;
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;
GRANT SELECT ON public.ea_event_with_documents TO authenticated;
GRANT SELECT ON public.ea_event_with_documents TO anon;
