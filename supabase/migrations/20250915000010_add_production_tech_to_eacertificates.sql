-- Add productionTech field to eacertificates table
-- This migration adds a productionTech field to store the production technology information

-- Add productionTech column to eacertificates table
ALTER TABLE public.eacertificates 
ADD COLUMN production_tech TEXT;

-- Add comment to document the productionTech field
COMMENT ON COLUMN public.eacertificates.production_tech IS 'Production technology used to generate this certificate (e.g., Solar, Wind, Hydro, etc.)';

-- Update the ea_certificate_with_documents view to include production_tech
DO $$
BEGIN
    -- Update ea_certificate_with_documents view to include production_tech
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
            ec.production_tech,
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
        GROUP BY ec.id, ec.type, ec.type2, ec.external_ids, ec.amounts, ec.emissions, ec.links, ec.organizations, ec.production_source_id, ec.production_tech, ec.created_at, ec.updated_at;
        
        -- Restore grants on view
        GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
        GRANT SELECT ON public.ea_certificate_with_documents TO anon;
    END IF;
END $$;
