-- Migration: Rename Location.state to subdivision
-- This migration updates all JSONB location fields to use 'subdivision' instead of 'state'
-- Aligns with PEACH-DataModel specification which uses ISO 3166-2 subdivision codes

-- Update organizations.location array (JSONB array of Location objects)
UPDATE public.organizations
SET location = (
  SELECT jsonb_agg(
    CASE
      WHEN elem ? 'state' THEN
        (elem - 'state') || jsonb_build_object('subdivision', elem->>'state')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(location) AS elem
)
WHERE location IS NOT NULL
  AND jsonb_typeof(location) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(location) elem WHERE elem ? 'state'
  );

-- Update events.location (single Location JSONB object)
UPDATE public.events
SET location = (location - 'state') || jsonb_build_object('subdivision', location->>'state')
WHERE location IS NOT NULL
  AND jsonb_typeof(location) = 'object'
  AND location ? 'state';

-- Update production_sources.location (single Location JSONB object)
UPDATE public.production_sources
SET location = (location - 'state') || jsonb_build_object('subdivision', location->>'state')
WHERE location IS NOT NULL
  AND jsonb_typeof(location) = 'object'
  AND location ? 'state';

-- Add comment documenting the change
COMMENT ON COLUMN public.organizations.location IS 'Array of Location objects. Uses subdivision (ISO 3166-2) instead of state.';
COMMENT ON COLUMN public.events.location IS 'Location object. Uses subdivision (ISO 3166-2) instead of state.';
COMMENT ON COLUMN public.production_sources.location IS 'Location object (required). Uses subdivision (ISO 3166-2) instead of state.';
