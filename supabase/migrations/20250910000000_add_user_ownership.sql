-- Add User Ownership to All Entities
-- Created: 2025-09-10
-- This migration adds owner_id to all entities and implements user-based data isolation

-- Add owner_id column to all main entities
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.eacertificates 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.production_sources 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance on owner_id columns
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_eacertificates_owner_id ON public.eacertificates(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS idx_production_sources_owner_id ON public.production_sources(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON public.documents(owner_id);

-- Create function to automatically set owner_id on insert
CREATE OR REPLACE FUNCTION public.set_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set owner_id if it's not already set
    IF NEW.owner_id IS NULL THEN
        NEW.owner_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically set owner_id on insert
CREATE TRIGGER trg_set_organizations_owner_id
    BEFORE INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

CREATE TRIGGER trg_set_eacertificates_owner_id
    BEFORE INSERT ON public.eacertificates
    FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

CREATE TRIGGER trg_set_events_owner_id
    BEFORE INSERT ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

CREATE TRIGGER trg_set_production_sources_owner_id
    BEFORE INSERT ON public.production_sources
    FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

CREATE TRIGGER trg_set_documents_owner_id
    BEFORE INSERT ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.set_owner_id();

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Anyone can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can view EACertificates" ON public.eacertificates;
DROP POLICY IF EXISTS "Authenticated users can create EACertificates" ON public.eacertificates;
DROP POLICY IF EXISTS "Authenticated users can update EACertificates" ON public.eacertificates;
DROP POLICY IF EXISTS "Authenticated users can delete EACertificates" ON public.eacertificates;
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;
DROP POLICY IF EXISTS "Anyone can view production sources" ON public.production_sources;
DROP POLICY IF EXISTS "Authenticated users can create production sources" ON public.production_sources;
DROP POLICY IF EXISTS "Authenticated users can update production sources" ON public.production_sources;
DROP POLICY IF EXISTS "Authenticated users can delete production sources" ON public.production_sources;

-- Create new owner-based RLS policies for organizations
CREATE POLICY "Users can view their own organizations" ON public.organizations
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own organizations" ON public.organizations
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own organizations" ON public.organizations
    FOR DELETE USING (owner_id = auth.uid());

-- Create new owner-based RLS policies for documents
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create documents" ON public.documents
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (owner_id = auth.uid());

-- Create new owner-based RLS policies for eacertificates
CREATE POLICY "Users can view their own eacertificates" ON public.eacertificates
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create eacertificates" ON public.eacertificates
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own eacertificates" ON public.eacertificates
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own eacertificates" ON public.eacertificates
    FOR DELETE USING (owner_id = auth.uid());

-- Create new owner-based RLS policies for events
CREATE POLICY "Users can view their own events" ON public.events
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create events" ON public.events
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own events" ON public.events
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own events" ON public.events
    FOR DELETE USING (owner_id = auth.uid());

-- Create new owner-based RLS policies for production_sources
CREATE POLICY "Users can view their own production sources" ON public.production_sources
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create production sources" ON public.production_sources
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own production sources" ON public.production_sources
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own production sources" ON public.production_sources
    FOR DELETE USING (owner_id = auth.uid());

-- Update the views to include owner_id for consistency
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
CREATE OR REPLACE VIEW public.ea_certificate_with_documents AS
SELECT 
    ec.id,
    ec.type,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.links,
    ec.owner_id,
    ec.created_at,
    ec.updated_at,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'docId', d.id,
                'url', d.url,
                'fileType', d.file_type,
                'title', d.title,
                'description', d.description
            )
        ) FILTER (WHERE d.id IS NOT NULL), 
        '[]'::json
    ) as documents
FROM public.eacertificates ec
LEFT JOIN public.documents d ON d.id = ANY(ec.documents)
GROUP BY ec.id, ec.type, ec.external_ids, ec.amounts, ec.emissions, ec.links, ec.owner_id, ec.created_at, ec.updated_at;

DROP VIEW IF EXISTS public.ea_event_with_documents;
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
    ee.owner_id,
    ee.created_at,
    ee.updated_at,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'docId', d.id,
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
GROUP BY ee.id, ee.target, ee.target_id, ee.type, ee.description, ee.dates, ee.location, ee.organizations, ee.notes, ee.links, ee.owner_id, ee.created_at, ee.updated_at;

DROP VIEW IF EXISTS public.production_source_with_documents;
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
    ps.owner_id,
    ps.created_at,
    ps.updated_at,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'docId', d.id,
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
GROUP BY ps.id, ps.external_ids, ps.related_production_sources, ps.name, ps.description, ps.location, ps.organizations, ps.links, ps.technology, ps.events, ps.metadata, ps.owner_id, ps.created_at, ps.updated_at;

-- Grant permissions on updated views
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_event_with_documents TO authenticated;
GRANT SELECT ON public.ea_event_with_documents TO anon;
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;

-- Migration complete - User ownership is now enforced on all entities
