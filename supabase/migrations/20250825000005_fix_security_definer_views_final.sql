-- Fix Security Definer Views Final Migration
-- Created: 2025-08-25
-- This migration explicitly fixes the Security Definer View issues by recreating views with explicit security settings

-- 1. Completely drop all problematic views with CASCADE to remove any dependencies
DROP VIEW IF EXISTS public.ea_certificate_with_documents CASCADE;
DROP VIEW IF EXISTS public.ea_event_with_documents CASCADE;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source CASCADE;
DROP VIEW IF EXISTS public.production_source_with_documents CASCADE;

-- 2. Recreate views with explicit SECURITY INVOKER (default behavior, but explicit)
CREATE VIEW public.ea_certificate_with_documents 
WITH (security_invoker = true) AS
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

CREATE VIEW public.ea_event_with_documents 
WITH (security_invoker = true) AS
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

CREATE VIEW public.production_source_with_documents 
WITH (security_invoker = true) AS
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

CREATE VIEW public.ea_certificate_with_production_source 
WITH (security_invoker = true) AS
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

-- 3. Grant permissions on all the recreated views
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_event_with_documents TO authenticated;
GRANT SELECT ON public.ea_event_with_documents TO anon;
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated;
GRANT SELECT ON public.ea_certificate_with_production_source TO anon;

-- Migration completed successfully
