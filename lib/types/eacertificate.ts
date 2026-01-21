// EACertificate System Type Definitions (Simplified Structure)

// EAC Type enum (matches database enum)
// Note: CR (Carbon Removal) is now a subtype of CC with type2='Carbon Removal'
export enum EACType {
  REC = "REC",
  RTC = "RTC",
  RNG = "RNG",
  SAF = "SAF",
  CC = "CC"
}

// File Type enum for documents (matches database enum)
export enum FileType {
  CERTIFICATE = "CERTIFICATE",
  POS = "POS",
  CONTRACT = "CONTRACT",
  AUDIT = "AUDIT",
  LABTEST = "LABTEST",
  CONSIGNMENT = "CONSIGNMENT",
  IMAGE = "IMAGE",
  ORGANIZATION_DOCUMENT = "ORGANIZATION_DOCUMENT"
}

// EventTarget enum (matches database enum)
export enum EventTarget {
  EAC = "EAC",
  PRODUCT = "PRODUCT",
  PSOURCE = "PSOURCE"
}

// Default Roles that an organization could have
export enum OrgRoleTypes {
  REGISTRY = "Registry",
  ISSUER = "Issuer", // usually the issuer is the registry, but there could be some times where the document has been issued by someone else
  PRODUCER = "Producer",
  SELLER = "Seller",
  BROKER = "Broker",
  EACBUYER = "Buyer", // should we use this? in case the buyer is different from the beneficiary eg for Scope3 (eg PL = BUYER, Supplier = BENEFICIARY)
  EACBENEFICIARY = "Beneficiary",
  FUEL_USER = "Fuel User", // for book & claim accounting where one org buys the EAC and another the fuel
  TRANSPORT = "Transport",
  GRID_OPERATOR = "Grid Operator", // different from registry, might be useful for other grids (thermal / gas)? but the registry is usually also a GRID_Operator, so this RoleType is used only if the org is not also a Registry
  MRV_AUDITOR = "Auditor",
  MRV_RATING_AGENCY = "Rating Agency",
  MRV_LABEL = "Label",
  MRV_VERIFIER = "Verifier",
  MRV_VALIDATOR = "Validator", // Validator != Verifier so we need 2 different role types, ⚠️ but the user could be confused as to which to select. like in the EACEventType(Validator vs Verification)
  MRV_LAB = "Lab",
  OTHER = "Other" // if the user sets it to Other, then they need to fill the organization.roleCustom or OrganizationRole.roleCustom
}

// Event Type enum (matches database enum)
export enum EACEventType {
  CREATION = "CREATION",
  ACTIVATION = "ACTIVATION",
  PAUSE = "PAUSE",
  SUSPENSION = "SUSPENSION",
  TERMINATION = "TERMINATION",
  PRODUCTION = "PRODUCTION",
  ISSUANCE = "ISSUANCE",
  REDEMPTION = "REDEMPTION",
  TRANSFER = "TRANSFER",
  TRANSPORT = "TRANSPORT",
  INJECTION = "INJECTION",
  AUDIT = "AUDIT",
  LAB_TEST = "LAB_TEST",
  VERIFICATION = "VERIFICATION",
  VALIDATION = "VALIDATION",
  RATING = "RATING",
  LABELING = "LABELING"
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

// Location interface
export interface Location {
  country: string;      // ISO 3166-1 alpha-2 country code (required)
  subdivision?: string; // ISO 3166-2 subdivision code (state/province)
  region?: string;      // Market/grid/admin region
  address?: string;
  zipCode?: string;     // Postal code
  latitude?: number;
  longitude?: number;
  geoBounds?: string;   // Geospatial data file describing spatial boundaries, e.g., Shapefile, KML, GeoJSON
}

// OrganizationRole interface for events
export interface OrganizationRole {
  orgId: string;
  role: OrgRoleTypes;    // Role type (required, typed as enum)
  orgName: string;       // Organization name (required for display)
  roleCustom?: string;   // Custom role name when role === "Other"
  externalIDs?: ExternalID[]; // Context-specific external IDs
}

// MetadataItem interface
export interface MetadataItem {
  key: string;
  label: string;
  value?: string;
  type?: string; // Type hint: string, number, boolean, date, enum
  options?: string[]; // Valid options when type is 'enum'
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
  conversionFactorUnits?: string; // Description of conversion ratio (e.g., "kWh/MWh")
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

// Contact interface for organization contacts
export interface Contact {
  value: string;
  label?: string;
}

// Organization interface
export interface Organization {
  id: string;
  name: string;
  nameExpanded?: string; // Full/expanded organization name
  externalIDs?: ExternalID[];
  url?: string;
  description?: string;
  contacts?: Contact[]; // Array of contact objects
  location?: Location[];
  documents?: string[]; // Array of document UUIDs
}

// Main EACertificate interface
export interface EACertificate {
  id: string;
  type: EACType;
  type2?: string; // Additional certificate type/subtype (e.g., "Carbon Removal" for CC)
  externalIDs?: ExternalID[];
  amounts: Amount[];
  emissions?: EmissionsData[];
  links?: string[];
  documents?: string[]; // Array of document UUIDs
  relatedCertificates?: string[]; // Array of related certificate IDs
  metadata?: MetadataItem[]; // Custom metadata
  productionSourceId?: string;
  productionTech?: string; // Production technology used to generate this certificate
  created_at: string;
  updated_at: string;
}

// Main Event interface (exact match to your requirements)
export interface Event {
  id: string;
  target: EventTarget;
  targetId: string; // References other entity UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
  type: string;
  value?: string; // Arbitrary string value associated with the event
  dates: {
    start: Date;
    end?: Date;
  };
  location?: Location;
  organizations?: OrganizationRole[];
  notes?: string; // Optional notes or description of the event
  documents?: string[]; // Array of document UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
  links?: string[];
  metadata?: MetadataItem[];
}

// Main ProductionSource interface
export interface ProductionSource {
  id: string;
  externalIDs?: ExternalID[];
  relatedProductionSourcesIds?: string[];
  name?: string;
  description?: string;
  location: Location;
  organizations?: OrganizationRole[];
  links?: string[];
  documents?: string[]; // Array of document UUIDs
  technology: string[]; // Array of technology types (e.g., ["Solar", "Wind"])
  eacTypes?: EACType[]; // Array of EAC types this source can generate
  labels?: string[]; // Array of certification labels (e.g., ["Green-e", "ISCC"])
  operationStartDate?: string; // ISO date when source started operating
  events?: Event[];
  metadata?: MetadataItem[];
}

// Database table interfaces (for Supabase operations)
export interface OrganizationDB {
  id: string;
  name: string;
  name_expanded: string | null; // Full/expanded organization name
  external_ids: ExternalID[] | null;
  url: string | null;
  description: string | null;
  contacts: Contact[] | null; // Array of contact objects
  location: Location[] | null;
  documents: string[] | null; // Array of document UUIDs
  created_at: string;
  updated_at: string;
}

export interface EACertificateDB {
  id: string;
  type: EACType;
  type2: string | null; // Additional certificate type/subtype
  external_ids: ExternalID[] | null;
  amounts: Amount[];
  emissions: EmissionsData[] | null;
  links: string[] | null;
  documents: string[] | null; // Array of document UUIDs
  related_certificates: string[] | null; // Array of related certificate IDs
  metadata: MetadataItem[] | null; // Custom metadata
  production_source_id: string | null;
  production_tech: string | null;
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
  value: string | null;
  dates: {
    start: string;
    end?: string;
  };
  location: Location | null;
  organizations: OrganizationRole[] | null;
  notes: string | null; // Optional notes or description of the event
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
  technology: string[]; // Array of technology types
  eac_types: EACType[] | null; // Array of EAC types this source can generate
  labels: string[] | null; // Array of certification labels
  operation_start_date: string | null; // ISO date
  events: Event[] | null;
  metadata: MetadataItem[] | null;
  created_at: string;
  updated_at: string;
}

// Create/Update interfaces
export interface CreateEACertificateData {
  type: EACType;
  type2?: string; // Additional certificate type/subtype
  externalIDs?: ExternalID[];
  amounts: Amount[];
  emissions?: EmissionsData[];
  links?: string[];
  documents?: Document[];
  relatedCertificates?: string[];
  metadata?: MetadataItem[];
  productionSourceId?: string;
  productionTech?: string;
}

export interface CreateEventData {
  target: EventTarget;
  targetId: string;
  type: string;
  value?: string;
  dates: {
    start: Date;
    end?: Date;
  };
  location?: Location;
  organizations?: OrganizationRole[];
  notes?: string; // Optional notes or description of the event
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
  technology: string[]; // Array of technology types
  eacTypes?: EACType[];
  labels?: string[];
  operationStartDate?: string;
  events?: Event[];
  metadata?: MetadataItem[];
}

export interface UpdateEACertificateData {
  type?: EACType;
  type2?: string; // Additional certificate type/subtype
  externalIDs?: ExternalID[];
  amounts?: Amount[];
  emissions?: EmissionsData[];
  links?: string[];
  documents?: Document[];
  relatedCertificates?: string[];
  metadata?: MetadataItem[];
  productionSourceId?: string;
  productionTech?: string;
}

export interface UpdateEventData {
  target?: EventTarget;
  targetId?: string;
  type?: string;
  value?: string;
  dates?: {
    start?: Date;
    end?: Date;
  };
  location?: Location;
  organizations?: OrganizationRole[];
  notes?: string; // Optional notes or description of the event
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
  technology?: string[]; // Array of technology types
  eacTypes?: EACType[];
  labels?: string[];
  operationStartDate?: string;
  events?: Event[];
  metadata?: MetadataItem[];
}

export interface CreateOrganizationData {
  name: string;
  nameExpanded?: string;
  externalIDs?: ExternalID[];
  url?: string;
  description?: string;
  contacts?: Contact[];
  location?: Location[];
}

export interface UpdateOrganizationData {
  name?: string;
  nameExpanded?: string;
  externalIDs?: ExternalID[];
  url?: string;
  description?: string;
  contacts?: Contact[];
  location?: Location[];
}

export interface CreateDocumentData {
  id: string;
  url: string;
  fileType: FileType;
  title?: string;
  description?: string;
  metadata?: MetadataItem[];
}

export interface UpdateDocumentData {
  url?: string;
  fileType?: FileType;
  title?: string;
  description?: string;
  metadata?: MetadataItem[];
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
  [EACType.CC]: 'Carbon Credit'
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

export const ORG_ROLE_NAMES: Record<OrgRoleTypes, string> = {
  [OrgRoleTypes.REGISTRY]: 'Registry',
  [OrgRoleTypes.ISSUER]: 'Issuer',
  [OrgRoleTypes.PRODUCER]: 'Producer',
  [OrgRoleTypes.SELLER]: 'Seller',
  [OrgRoleTypes.BROKER]: 'Broker',
  [OrgRoleTypes.EACBUYER]: 'Buyer',
  [OrgRoleTypes.EACBENEFICIARY]: 'Beneficiary',
  [OrgRoleTypes.FUEL_USER]: 'Fuel User',
  [OrgRoleTypes.TRANSPORT]: 'Transport',
  [OrgRoleTypes.GRID_OPERATOR]: 'Grid Operator',
  [OrgRoleTypes.MRV_AUDITOR]: 'Auditor',
  [OrgRoleTypes.MRV_RATING_AGENCY]: 'Rating Agency',
  [OrgRoleTypes.MRV_LABEL]: 'Label',
  [OrgRoleTypes.MRV_VERIFIER]: 'Verifier',
  [OrgRoleTypes.MRV_VALIDATOR]: 'Validator',
  [OrgRoleTypes.MRV_LAB]: 'Lab',
  [OrgRoleTypes.OTHER]: 'Other'
};

export const EAC_EVENT_TYPE_NAMES: Record<EACEventType, string> = {
  [EACEventType.CREATION]: 'Creation',
  [EACEventType.ACTIVATION]: 'Activation',
  [EACEventType.PAUSE]: 'Pause',
  [EACEventType.SUSPENSION]: 'Suspension',
  [EACEventType.TERMINATION]: 'Termination',
  [EACEventType.PRODUCTION]: 'Production',
  [EACEventType.ISSUANCE]: 'Issuance',
  [EACEventType.REDEMPTION]: 'Redemption',
  [EACEventType.TRANSFER]: 'Transfer',
  [EACEventType.TRANSPORT]: 'Transport',
  [EACEventType.INJECTION]: 'Injection',
  [EACEventType.AUDIT]: 'Audit',
  [EACEventType.LAB_TEST]: 'Lab Test',
  [EACEventType.VERIFICATION]: 'Verification',
  [EACEventType.VALIDATION]: 'Validation',
  [EACEventType.RATING]: 'Rating',
  [EACEventType.LABELING]: 'Labeling'
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

/**
 * Formats an organization role for display.
 * If the role is "Other" and roleCustom is provided, returns the custom role.
 * Otherwise, returns the role name from the enum or the role string itself.
 */
export function formatOrganizationRole(orgRole: OrganizationRole): string {
  if (orgRole.role === OrgRoleTypes.OTHER && orgRole.roleCustom) {
    return orgRole.roleCustom;
  }
  // Check if the role matches an enum value
  const enumValue = Object.values(OrgRoleTypes).find(val => val === orgRole.role);
  if (enumValue) {
    return ORG_ROLE_NAMES[enumValue as OrgRoleTypes];
  }
  // Fallback to the role string itself
  return orgRole.role;
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
