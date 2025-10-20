-- Add metadata field to documents table (if not already present)
-- This migration ensures the documents table has the metadata field for consistency

-- Check if metadata column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'metadata'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.documents 
        ADD COLUMN metadata jsonb[] DEFAULT '{}'::jsonb[];
    END IF;
END $$;

-- Add comment to document the metadata field
COMMENT ON COLUMN public.documents.metadata IS 'Array of metadata item objects (jsonb[])';

-- Update any existing views that reference documents to include metadata
-- Check if the view exists and update it
DO $$
BEGIN
    -- Update ea_certificate_with_documents view to include metadata in documents
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'ea_certificate_with_documents' AND table_schema = 'public') THEN
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
        
        -- Restore grants on view
        GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
        GRANT SELECT ON public.ea_certificate_with_documents TO anon;
    END IF;
END $$;

-- Update any other views that might reference documents
-- Check for production_sources_with_documents view
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'production_sources_with_documents' AND table_schema = 'public') THEN
        DROP VIEW IF EXISTS public.production_sources_with_documents;
        
        CREATE OR REPLACE VIEW public.production_sources_with_documents AS
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
        FROM public.production_sources ps
        GROUP BY ps.id, ps.external_ids, ps.related_production_sources, ps.name, ps.description, ps.location, ps.organizations, ps.links, ps.technology, ps.metadata, ps.owner_id, ps.created_at, ps.updated_at;
        
        -- Restore grants on view
        GRANT SELECT ON public.production_sources_with_documents TO authenticated;
        GRANT SELECT ON public.production_sources_with_documents TO anon;
    END IF;
END $$;
