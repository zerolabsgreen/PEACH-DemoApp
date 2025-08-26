-- Address Supabase Security Advisor findings
-- 1) Ensure views run as SECURITY INVOKER
-- 2) Set fixed search_path for validation function

BEGIN;

-- Set views to SECURITY INVOKER
ALTER VIEW public.ea_event_with_documents SET (security_invoker = true);
ALTER VIEW public.production_source_with_documents SET (security_invoker = true);
ALTER VIEW public.ea_certificate_with_production_source SET (security_invoker = true);
ALTER VIEW public.ea_certificate_with_documents SET (security_invoker = true);

-- Pin search_path for validation function to avoid role-mutable search_path
ALTER FUNCTION public.validate_eacertificate_json() SET search_path = pg_temp;

COMMIT;


