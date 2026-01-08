-- Migration: Update file_type_enum to uppercase values
-- Old values: Certificate, Proof of Sustainability, Contract, Audit, Lab Test, Consignment receipt, Image, Organization Document
-- New values: CERTIFICATE, POS, CONTRACT, AUDIT, LABTEST, CONSIGNMENT, IMAGE, ORGANIZATION_DOCUMENT

-- Step 1: Create new enum type with uppercase values
CREATE TYPE public.file_type_enum_new AS ENUM (
    'CERTIFICATE',
    'POS',
    'CONTRACT',
    'AUDIT',
    'LABTEST',
    'CONSIGNMENT',
    'IMAGE',
    'ORGANIZATION_DOCUMENT'
);

-- Step 2: Alter documents table to use TEXT temporarily
ALTER TABLE public.documents
ALTER COLUMN file_type TYPE TEXT;

-- Step 3: Migrate data to new format
UPDATE public.documents SET file_type =
    CASE file_type
        WHEN 'Certificate' THEN 'CERTIFICATE'
        WHEN 'Proof of Sustainability' THEN 'POS'
        WHEN 'Contract' THEN 'CONTRACT'
        WHEN 'Audit' THEN 'AUDIT'
        WHEN 'Lab Test' THEN 'LABTEST'
        WHEN 'Consignment receipt' THEN 'CONSIGNMENT'
        WHEN 'Image' THEN 'IMAGE'
        WHEN 'Organization Document' THEN 'ORGANIZATION_DOCUMENT'
        ELSE file_type
    END;

-- Step 4: Convert to new enum type
ALTER TABLE public.documents
ALTER COLUMN file_type TYPE public.file_type_enum_new USING file_type::public.file_type_enum_new;

-- Step 5: Drop old enum and rename new one
DROP TYPE public.file_type_enum;
ALTER TYPE public.file_type_enum_new RENAME TO file_type_enum;

-- Add comment
COMMENT ON TYPE public.file_type_enum IS 'Document file types: CERTIFICATE, POS (Proof of Sustainability), CONTRACT, AUDIT, LABTEST, CONSIGNMENT, IMAGE, ORGANIZATION_DOCUMENT';
