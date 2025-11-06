-- Make eacertificates.external_ids optional (nullable)
-- Reason: App can create certificates without external IDs

begin;

alter table if exists public.eacertificates
  alter column external_ids drop not null;

-- Keep explicit nulls allowed (no default needed)

commit;


