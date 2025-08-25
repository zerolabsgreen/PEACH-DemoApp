-- Complete Database Setup Migration
-- Created: 2025-08-25
-- This migration creates the entire database structure from scratch

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create EAC Type enum
CREATE TYPE public.eac_type_enum AS ENUM (
    'REC',
    'RTC', 
    'RNG',
    'SAF',
    'CC',
    'CR'
);

-- Create File Type enum for documents
CREATE TYPE public.file_type_enum AS ENUM (
    'Certificate',
    'Proof of Sustainability',
    'Contract',
    'Audit',
    'Lab Test',
    'Consignment receipt',
    'Image'
);

-- Create EACEventTarget enum
CREATE TYPE public.eac_event_target_enum AS ENUM (
    'EAC',
    'PRODUCT',
    'PSOURCE'
);

-- Create a basic profiles table to store additional user information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    external_ids JSONB, -- Array of ExternalID objects
    url TEXT,
    description TEXT,
    contacts TEXT,
    location JSONB, -- Array of Location objects
    documents JSONB, -- Array of Document objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    doc_id TEXT UNIQUE NOT NULL, -- External document identifier
    url TEXT NOT NULL,
    file_type public.file_type_enum NOT NULL,
    title TEXT,
    description TEXT,
    metadata JSONB,
    organizations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create EACertificates table with all properties embedded as JSON
CREATE TABLE IF NOT EXISTS public.eacertificates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type public.eac_type_enum NOT NULL,
    external_ids JSONB, -- Array of ExternalID objects
    amounts JSONB NOT NULL, -- Array of Amount objects
    emissions JSONB, -- Array of EmissionsData objects
    links TEXT[], -- Simple array of strings
    documents JSONB, -- Array of Document objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    target public.eac_event_target_enum NOT NULL,
    target_id UUID NOT NULL, -- UUID type
    type TEXT NOT NULL,
    description TEXT,
    dates JSONB NOT NULL, -- Contains start and optional end dates
    location JSONB, -- Location object
    organizations JSONB, -- Array of OrganizationRole objects
    notes TEXT,
    documents JSONB, -- Array of Document objects
    links TEXT[], -- Array of strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ProductionSource table
CREATE TABLE IF NOT EXISTS public.production_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    external_ids JSONB, -- Array of ExternalID objects
    related_production_sources_ids TEXT[], -- Array of string IDs
    name TEXT,
    description TEXT,
    location JSONB NOT NULL, -- Location object (required)
    organizations JSONB, -- Array of OrganizationRole objects
    links TEXT[], -- Array of strings
    documents JSONB, -- Array of Document objects
    technology TEXT NOT NULL, -- Technology type (required)
    events JSONB, -- Array of EACEvent objects
    metadata JSONB, -- Array of MetadataItem objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_eacertificates_type ON public.eacertificates(type);
CREATE INDEX IF NOT EXISTS idx_eacertificates_created_at ON public.eacertificates(created_at);
CREATE INDEX IF NOT EXISTS idx_eacertificates_documents ON public.eacertificates USING GIN(documents);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);
CREATE INDEX IF NOT EXISTS idx_documents_doc_id ON public.documents(doc_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);
CREATE INDEX IF NOT EXISTS idx_events_target ON public.events(target);
CREATE INDEX IF NOT EXISTS idx_events_target_id ON public.events(target_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);
CREATE INDEX IF NOT EXISTS idx_production_sources_name ON public.production_sources(name);
CREATE INDEX IF NOT EXISTS idx_production_sources_technology ON public.production_sources(technology);
CREATE INDEX IF NOT EXISTS idx_production_sources_created_at ON public.production_sources(created_at);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eacertificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for organizations
CREATE POLICY "Anyone can view organizations" ON public.organizations
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage organizations" ON public.organizations
    FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for documents
CREATE POLICY "Anyone can view documents" ON public.documents
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage documents" ON public.documents
    FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for eacertificates
CREATE POLICY "Anyone can view EACertificates" ON public.eacertificates
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create EACertificates" ON public.eacertificates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update EACertificates" ON public.eacertificates
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete EACertificates" ON public.eacertificates
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for events
CREATE POLICY "Anyone can view events" ON public.events
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create events" ON public.events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update events" ON public.events
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete events" ON public.events
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for production_sources
CREATE POLICY "Anyone can view production sources" ON public.production_sources
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create production sources" ON public.production_sources
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update production sources" ON public.production_sources
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete production sources" ON public.production_sources
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eacertificates_updated_at
    BEFORE UPDATE ON public.eacertificates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_production_sources_updated_at
    BEFORE UPDATE ON public.production_sources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to validate EACertificate JSON structure
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate Event JSON structure
CREATE OR REPLACE FUNCTION public.validate_event_json()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate dates structure has start date
    IF NOT (NEW.dates ? 'start') THEN
        RAISE EXCEPTION 'Event must have a start date';
    END IF;
    
    -- Validate dates structure format
    IF NOT (jsonb_typeof(NEW.dates->'start') = 'string') THEN
        RAISE EXCEPTION 'Start date must be a string';
    END IF;
    
    -- If end date exists, validate it's a string
    IF (NEW.dates ? 'end') AND (jsonb_typeof(NEW.dates->'end') != 'string') THEN
        RAISE EXCEPTION 'End date must be a string';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate ProductionSource JSON structure
CREATE OR REPLACE FUNCTION public.validate_productionsource_json()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate location is present and is an object
    IF NOT (NEW.location IS NOT NULL AND jsonb_typeof(NEW.location) = 'object') THEN
        RAISE EXCEPTION 'ProductionSource must have a valid location object';
    END IF;
    
    -- Validate technology is not empty
    IF NEW.technology IS NULL OR NEW.technology = '' THEN
        RAISE EXCEPTION 'ProductionSource must have a technology';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for validation
CREATE TRIGGER validate_eacertificate_json_trigger
    BEFORE INSERT OR UPDATE ON public.eacertificates
    FOR EACH ROW EXECUTE FUNCTION public.validate_eacertificate_json();

CREATE TRIGGER validate_event_json_trigger
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.validate_event_json();

CREATE TRIGGER validate_productionsource_json_trigger
    BEFORE INSERT OR UPDATE ON public.production_sources
    FOR EACH ROW EXECUTE FUNCTION public.validate_productionsource_json();

-- Create view for EACertificates with documents
CREATE OR REPLACE VIEW public.ea_certificate_with_documents AS
SELECT 
    ec.id,
    ec.type,
    ec.external_ids,
    ec.amounts,
    ec.emissions,
    ec.links,
    ec.created_at,
    ec.updated_at,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'docId', d.doc_id,
                'url', d.url,
                'fileType', d.file_type,
                'title', d.title,
                'description', d.description
            )
        ) FILTER (WHERE d.id IS NOT NULL), 
        '[]'::json
    ) as documents
FROM public.eacertificates ec
LEFT JOIN public.documents d ON d.id::text = ANY(
    SELECT jsonb_array_elements_text(ec.documents->'id')
)
GROUP BY ec.id, ec.type, ec.external_ids, ec.amounts, ec.emissions, ec.links, ec.created_at, ec.updated_at;

-- Create view for Events with documents
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
                'docId', d.doc_id,
                'url', d.url,
                'fileType', d.file_type,
                'title', d.title,
                'description', d.description
            )
        ) FILTER (WHERE d.id IS NOT NULL), 
        '[]'::json
    ) as documents
FROM public.events ee
LEFT JOIN public.documents d ON d.id::text = ANY(
    SELECT jsonb_array_elements_text(ee.documents->'id')
)
GROUP BY ee.id, ee.target, ee.target_id, ee.type, ee.description, ee.dates, ee.location, ee.organizations, ee.notes, ee.links, ee.created_at, ee.updated_at;

-- Create view for ProductionSource with documents
CREATE OR REPLACE VIEW public.production_source_with_documents AS
SELECT 
    ps.id,
    ps.external_ids,
    ps.related_production_sources_ids,
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
                'docId', d.doc_id,
                'url', d.url,
                'fileType', d.file_type,
                'title', d.title,
                'description', d.description
            )
        ) FILTER (WHERE d.id IS NOT NULL), 
        '[]'::json
    ) as documents
FROM public.production_sources ps
LEFT JOIN public.documents d ON d.id::text = ANY(
    SELECT jsonb_array_elements_text(ps.documents->'id')
)
GROUP BY ps.id, ps.external_ids, ps.related_production_sources_ids, ps.name, ps.description, ps.location, ps.organizations, ps.links, ps.technology, ps.events, ps.metadata, ps.created_at, ps.updated_at;

-- Grant permissions on all views
GRANT SELECT ON public.ea_certificate_with_documents TO authenticated;
GRANT SELECT ON public.ea_certificate_with_documents TO anon;
GRANT SELECT ON public.ea_event_with_documents TO authenticated;
GRANT SELECT ON public.ea_event_with_documents TO anon;
GRANT SELECT ON public.production_source_with_documents TO authenticated;
GRANT SELECT ON public.production_source_with_documents TO anon;
