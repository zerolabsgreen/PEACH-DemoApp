-- Add organizations array to eacertificates table
-- This field will store an array of OrganizationRole objects

ALTER TABLE public.eacertificates 
ADD COLUMN organizations jsonb[] DEFAULT '{}'::jsonb[];

-- Add comment to document the new field
COMMENT ON COLUMN public.eacertificates.organizations IS 'Array of OrganizationRole objects (jsonb[])';

-- Update the ea_certificate_with_documents view to include organizations
DROP VIEW IF EXISTS public.ea_certificate_with_documents;

CREATE OR REPLACE VIEW public.ea_certificate_with_documents AS
SELECT 
    ec.id,
    ec.type,
    ec.type2,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.links,
    ec.organizations,
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
GROUP BY ec.id, ec.type, ec.type2, ec.external_ids, ec.amounts, ec.emissions, ec.links, ec.organizations, ec.production_source_id, ec.created_at, ec.updated_at;

-- Update the ea_certificate_with_production_source view to include organizations
DROP VIEW IF EXISTS public.ea_certificate_with_production_source;

CREATE OR REPLACE VIEW public.ea_certificate_with_production_source AS
SELECT 
    ec.id,
    ec.type,
    ec.type2,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.links,
    ec.organizations,
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

-- Restore grants on views
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_certificate_with_production_source TO authenticated;
GRANT SELECT ON public.ea_certificate_with_production_source TO anon;
