-- Migration: Update EACertificates schema
-- Changes:
-- 1. Add related_certificates column (TEXT[])
-- 2. Add metadata column (JSONB)

-- Step 1: Add new columns
ALTER TABLE public.eacertificates
ADD COLUMN IF NOT EXISTS related_certificates TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '[]'::jsonb;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_eacertificates_related_certificates ON public.eacertificates USING GIN(related_certificates);

-- Add comments
COMMENT ON COLUMN public.eacertificates.related_certificates IS 'Array of related certificate IDs for linking certificates together';
COMMENT ON COLUMN public.eacertificates.metadata IS 'Array of MetadataItem objects: [{key, label, value?, type?, required?, description?, options?}]';
