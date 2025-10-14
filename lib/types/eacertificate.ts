// EACertificate System Type Definitions (Simplified Structure)

// EAC Type enum (matches database enum)
export enum EACType {
  REC = "REC",
  RTC = "RTC",
  RNG = "RNG",
  SAF = "SAF",
  CC = "CC",
  CR = "CR"
}

// File Type enum for documents (matches database enum)
export enum FileType {
  CERTIFICATE = "Certificate",
  POS = "Proof of Sustainability",
  CONTRACT = "Contract",
  AUDIT = "Audit",
  LABTEST = "Lab Test",
  CONSIGNMENT = "Consignment receipt",
  IMAGE = "Image",
  ORGANIZATION_DOCUMENT = "Organization Document"
}

// EventTarget enum (matches database enum)
export enum EventTarget {
  EAC = "EAC",
  PRODUCT = "PRODUCT",
  PSOURCE = "PSOURCE"
}

// Document interface
export interface Document {
  id: string;
  url: string;
  fileType: FileType;
  title?: string;
  description?: string;
  metadata?: MetadataItem[];
  organizations?: OrganizationRole[];
}

// Database interface for documents
export interface DocumentDB {
  id: string;
  doc_id: string;
  url: string;
  file_type: FileType;
  title: string | null;
  description: string | null;
  metadata: MetadataItem[] | null;
  organizations: OrganizationRole[] | null;
  created_at: string;
  updated_at: string;
}

// Location interface for organizations
export interface Location {
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  postalCode?: string;
}

// OrganizationRole interface for events
export interface OrganizationRole {
  orgId: string;
  role: string;
  orgName?: string;
}

// MetadataItem interface
export interface MetadataItem {
  key: string;
  label: string;
  value?: string;
  type?: string;
  required?: boolean;
  description?: string;
}

// External ID interface
export interface ExternalID {
  id: string;
  ownerOrgId?: string;
  ownerOrgName?: string;
  description?: string;
  externalFieldName?: string;
}

// Amount interface
export interface Amount {
  amount: number;
  unit: string;
  conversionFactor?: number;
  conversionNotes?: string;
  isPrimary?: boolean;
}

// Emissions Data interface
export interface EmissionsData {
  carbonIntensity: number;
  ciUnit?: string;
  ciNotes?: string;
  emissionsFactor: number;
  efUnit?: string;
  efNotes?: string;
}

// Organization interface (exact match to your requirements)
export interface Organization {
  id: string;
  name: string;
  externalIDs?: ExternalID[];
  url?: string;
  description?: string;
  contact?: string;
  location?: Location[];
  documents?: string[]; // Array of document UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
}

// Main EACertificate interface (exact match to your requirements)
export interface EACertificate {
  id: string;
  type: EACType;
  type2?: string; // Additional certificate type information (free text)
  externalIDs?: ExternalID[];
  amounts: Amount[];
  emissions?: EmissionsData[];
  organizations?: OrganizationRole[];
  links?: string[];
  documents?: string[]; // Array of document UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
  productionSourceId?: string;
  created_at: string;
  updated_at: string;
}

// Main Event interface (exact match to your requirements)
export interface Event {
  id: string;
  target: EventTarget;
  targetId: string; // References other entity UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
  type: string;
  description?: string;
  dates: {
    start: Date;
    end?: Date;
  };
  location?: Location;
  organizations?: OrganizationRole[];
  notes?: string;
  documents?: string[]; // Array of document UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
  links?: string[];
  metadata?: MetadataItem[];
}

// Main ProductionSource interface (exact match to your requirements)
export interface ProductionSource {
  id: string;
  externalIDs?: ExternalID[];
  relatedProductionSourcesIds?: string[];
  name?: string;
  description?: string;
  location: Location;
  organizations?: OrganizationRole[];
  links?: string[];
  documents?: string[]; // Array of document UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
  technology: string;
  events?: Event[];
  metadata?: MetadataItem[];
}

// Database table interfaces (for Supabase operations)
export interface OrganizationDB {
  id: string;
  name: string;
  external_ids: ExternalID[] | null;
  url: string | null;
  description: string | null;
  contact: string | null;
  location: Location[] | null;
  documents: string[] | null; // Array of document UUIDs
  created_at: string;
  updated_at: string;
}

export interface EACertificateDB {
  id: string;
  type: EACType;
  type2: string | null; // Additional certificate type information (free text)
  external_ids: ExternalID[] | null;
  amounts: Amount[];
  emissions: EmissionsData[] | null;
  organizations: OrganizationRole[] | null;
  links: string[] | null;
  documents: string[] | null; // Array of document UUIDs
  production_source_id: string | null;
  created_at: string;
  updated_at: string;
}

// Interface for certificate with populated documents (for display)
export interface EACertificateWithDocuments extends Omit<EACertificateDB, 'documents'> {
  documents: Document[] | null; // Populated document objects instead of UUIDs
}

export interface EventDB {
  id: string;
  target: EventTarget;
  target_id: string; // UUID reference to other entities
  type: string;
  description: string | null;
  dates: {
    start: string;
    end?: string;
  };
  location: Location | null;
  organizations: OrganizationRole[] | null;
  notes: string | null;
  documents: string[] | null; // Array of document UUIDs
  links: string[] | null;
  metadata: MetadataItem[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionSourceDB {
  id: string;
  external_ids: ExternalID[] | null;
  related_production_sources: string[] | null;
  name: string | null;
  description: string | null;
  location: Location;
  organizations: OrganizationRole[] | null;
  links: string[] | null;
  documents: string[] | null; // Array of document UUIDs
  technology: string;
  events: Event[] | null;
  metadata: MetadataItem[] | null;
  created_at: string;
  updated_at: string;
}

// Create/Update interfaces
export interface CreateEACertificateData {
  type: EACType;
  type2?: string; // Additional certificate type information (free text)
  externalIDs?: ExternalID[];
  amounts: Amount[];
  emissions?: EmissionsData[];
  organizations?: OrganizationRole[];
  links?: string[];
  documents?: Document[];
  productionSourceId?: string;
}

export interface CreateEventData {
  target: EventTarget;
  targetId: string;
  type: string;
  description?: string;
  dates: {
    start: Date;
    end?: Date;
  };
  location?: Location;
  organizations?: OrganizationRole[];
  notes?: string;
  documents?: Document[];
  links?: string[];
  metadata?: MetadataItem[];
}

export interface CreateProductionSourceData {
  externalIDs?: ExternalID[];
  relatedProductionSourcesIds?: string[];
  name?: string;
  description?: string;
  location: Location;
  organizations?: OrganizationRole[];
  links?: string[];
  documents?: Document[];
  technology: string;
  events?: Event[];
  metadata?: MetadataItem[];
}

export interface UpdateEACertificateData {
  type?: EACType;
  type2?: string; // Additional certificate type information (free text)
  externalIDs?: ExternalID[];
  amounts?: Amount[];
  emissions?: EmissionsData[];
  organizations?: OrganizationRole[];
  links?: string[];
  documents?: Document[];
  productionSourceId?: string;
}

export interface UpdateEventData {
  target?: EventTarget;
  targetId?: string;
  type?: string;
  description?: string;
  dates?: {
    start?: Date;
    end?: Date;
  };
  location?: Location;
  organizations?: OrganizationRole[];
  notes?: string;
  documents?: Document[];
  links?: string[];
  metadata?: MetadataItem[];
}

export interface UpdateProductionSourceData {
  externalIDs?: ExternalID[];
  relatedProductionSourcesIds?: string[];
  name?: string;
  description?: string;
  location?: Location;
  organizations?: OrganizationRole[];
  links?: string[];
  documents?: Document[];
  technology?: string;
  events?: Event[];
  metadata?: MetadataItem[];
}

export interface CreateOrganizationData {
  name: string;
  externalIDs?: ExternalID[];
  url?: string;
  description?: string;
  contact?: string;
  location?: Location[];
}

export interface UpdateOrganizationData {
  name?: string;
  externalIDs?: ExternalID[];
  url?: string;
  description?: string;
  contact?: string;
  location?: Location[];
}

export interface CreateDocumentData {
  id: string;
  url: string;
  fileType: FileType;
  title?: string;
  description?: string;
}

export interface UpdateDocumentData {
  url?: string;
  fileType?: FileType;
  title?: string;
  description?: string;
}

// Filter and search interfaces
export interface EACertificateFilters {
  type?: EACType;
  organizationName?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
    unit?: string;
  };
  hasEmissionsData?: boolean;
  hasLinks?: boolean;
  hasDocuments?: boolean;
  documentType?: FileType;
}

export interface EventFilters {
  target?: EventTarget;
  targetId?: string;
  type?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  hasLocation?: boolean;
  hasOrganizations?: boolean;
  hasNotes?: boolean;
  hasDocuments?: boolean;
  hasLinks?: boolean;
}

export interface ProductionSourceFilters {
  name?: string;
  technology?: string;
  hasLocation?: boolean;
  hasOrganizations?: boolean;
  hasDocuments?: boolean;
  hasLinks?: boolean;
  hasEvents?: boolean;
  hasMetadata?: boolean;
}

export interface OrganizationFilters {
  name?: string;
  hasExternalIDs?: boolean;
  hasLocation?: boolean;
}

export interface DocumentFilters {
  fileType?: FileType;
  hasTitle?: boolean;
  hasDescription?: boolean;
}

// Response interfaces
export interface EACertificateListResponse {
  data: EACertificateDB[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface EACertificateResponse {
  data: EACertificateDB | null;
  error: string | null;
}

export interface EventListResponse {
  data: EventDB[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface EventResponse {
  data: EventDB | null;
  error: string | null;
}

export interface ProductionSourceListResponse {
  data: ProductionSourceDB[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ProductionSourceResponse {
  data: ProductionSourceDB | null;
  error: string | null;
}

export interface OrganizationListResponse {
  data: OrganizationDB[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface OrganizationResponse {
  data: OrganizationDB | null;
  error: string | null;
}

// Utility types
export type EACTypeCode = keyof typeof EACType;
export type FileTypeCode = keyof typeof FileType;
export type EventTargetCode = keyof typeof EventTarget;

export type AmountUnit = 
  | 'MWh' | 'kWh' | 'Wh'
  | 'MMBtu' | 'MBtu' | 'Btu'
  | 'MJ' | 'kJ' | 'J'
  | 'gallons' | 'liters'
  | 'tCO2e' | 'kgCO2e' | 'gCO2e'
  | 'tons' | 'kg' | 'g';

export type EmissionsUnit = 
  | 'gCO2e/kWh' | 'gCO2e/MJ' | 'gCO2e/MMBtu'
  | 'tCO2e/MWh' | 'kgCO2e/kWh'
  | 'gCO2e/tCO2e' | 'kgCO2e/tCO2e';

// Constants
export const EAC_TYPE_CODES = Object.keys(EACType) as EACTypeCode[];
export const FILE_TYPE_CODES = Object.keys(FileType) as FileTypeCode[];
export const EVENT_TARGET_CODES = Object.keys(EventTarget) as EventTargetCode[];

export const EAC_TYPE_NAMES: Record<EACType, string> = {
  [EACType.REC]: 'Renewable Energy Certificate',
  [EACType.RTC]: 'Renewable Thermal Certificate',
  [EACType.RNG]: 'Renewable Natural Gas',
  [EACType.SAF]: 'Sustainable Aviation Fuel',
  [EACType.CC]: 'Carbon Credit',
  [EACType.CR]: 'Carbon Removal'
};

export const FILE_TYPE_NAMES: Record<FileType, string> = {
  [FileType.CERTIFICATE]: 'Certificate',
  [FileType.POS]: 'Proof of Sustainability',
  [FileType.CONTRACT]: 'Contract',
  [FileType.AUDIT]: 'Audit',
  [FileType.LABTEST]: 'Lab Test',
  [FileType.CONSIGNMENT]: 'Consignment receipt',
  [FileType.IMAGE]: 'Image',
  [FileType.ORGANIZATION_DOCUMENT]: 'Organization Document'
};

export const EVENT_TARGET_NAMES: Record<EventTarget, string> = {
  [EventTarget.EAC]: 'Environmental Certificate',
  [EventTarget.PRODUCT]: 'Physical Product Chain-of-Custody',
  [EventTarget.PSOURCE]: 'Production Source'
};

export const COMMON_AMOUNT_UNITS: AmountUnit[] = [
  'MWh', 'kWh', 'MMBtu', 'MJ', 'gallons', 'tCO2e'
];

export const COMMON_EMISSIONS_UNITS: EmissionsUnit[] = [
  'gCO2e/kWh', 'gCO2e/MJ', 'gCO2e/MMBtu', 'tCO2e/MWh'
];

// Helper functions
export function isValidEACTypeCode(code: string): code is EACTypeCode {
  return EAC_TYPE_CODES.includes(code as EACTypeCode);
}

export function isValidFileTypeCode(code: string): code is FileTypeCode {
  return FILE_TYPE_CODES.includes(code as FileTypeCode);
}

export function getEACTypeName(code: EACType): string {
  return EAC_TYPE_NAMES[code];
}

export function getFileTypeName(code: FileType): string {
  return FILE_TYPE_NAMES[code];
}

export function getEventTargetName(code: EventTarget): string {
  return EVENT_TARGET_NAMES[code];
}

export function isPrimaryAmount(amount: Amount): boolean {
  return amount.isPrimary === true;
}

export function hasEmissionsData(certificate: EACertificate): boolean {
  return Boolean(certificate.emissions && certificate.emissions.length > 0);
}

export function hasLinks(certificate: EACertificate): boolean {
  return Boolean(certificate.links && certificate.links.length > 0);
}

export function hasDocuments(certificate: EACertificate): boolean {
  return Boolean(certificate.documents && certificate.documents.length > 0);
}

export function hasEventDocuments(event: Event): boolean {
  return Boolean(event.documents && event.documents.length > 0);
}

export function hasEventLocation(event: Event): boolean {
  return Boolean(event.location);
}

export function hasEventOrganizations(event: Event): boolean {
  return Boolean(event.organizations && event.organizations.length > 0);
}

export function hasEventNotes(event: Event): boolean {
  return Boolean(event.notes);
}

export function hasEventLinks(event: Event): boolean {
  return Boolean(event.links && event.links.length > 0);
}

export function hasExternalIDs(organization: Organization): boolean {
  return Boolean(organization.externalIDs && organization.externalIDs.length > 0);
}

export function hasLocation(organization: Organization): boolean {
  return Boolean(organization.location && organization.location.length > 0);
}

// Note: This function is no longer applicable since documents are now stored as UUID arrays
// To get documents by type, you would need to:
// 1. Fetch the document IDs from the certificate
// 2. Query the documents table with those IDs
// 3. Filter by fileType
export function getDocumentIds(certificate: EACertificate): string[] {
  return certificate.documents || [];
}
