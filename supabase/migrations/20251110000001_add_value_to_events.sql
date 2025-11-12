-- Add a simple string "value" column to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS value TEXT;

-- Optionally, document the purpose of the column
COMMENT ON COLUMN public.events.value IS 'Arbitrary string value associated with the event (e.g., numeric as text, status, or code).';


