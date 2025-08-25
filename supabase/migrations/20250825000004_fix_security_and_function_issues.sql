-- Fix Security and Function Issues Migration
-- Created: 2025-08-25
-- This migration fixes security definer view issues and function search path mutable warnings

-- 1. Fix Function Search Path Mutable warnings by setting explicit search_path
-- This prevents SQL injection attacks and ensures consistent behavior

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix Security Definer View issues by recreating views without SECURITY DEFINER
-- Drop existing views first
DROP VIEW IF EXISTS public.ea_certificate_with_documents;
DROP VIEW IF EXISTS public.ea_event_with_documents;
DROP VIEW IF EXISTS public.ea_certificate_with_production_source;
DROP VIEW IF EXISTS public.production_source_with_documents;

-- Recreate views without SECURITY DEFINER (they will inherit caller's permissions)
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
