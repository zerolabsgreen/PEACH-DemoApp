import {
  EACertificateDB,
  EventDB,
  OrganizationDB,
  ProductionSourceDB,
  EACType,
  OrgRoleTypes,
  EACEventType,
} from '@/lib/types/eacertificate';
import { format } from 'date-fns';
import JSZip from 'jszip';

// TCAT field definitions for different certificate types
export interface TCATFieldDefinition {
  key: string;
  label: string;
  description: string;
}

// Common TCAT fields used across all certificate types
const COMMON_TCAT_FIELDS: TCATFieldDefinition[] = [
  { key: 'A', label: 'Project name', description: 'Project Name' },
  { key: 'B', label: 'Project/unit ID', description: 'Project ID/registration number (if applicable)' },
  { key: 'C', label: 'Registry', description: 'Registry or program where certificates were issued and retired' },
  { key: 'D', label: 'Proof of retirement', description: 'Link to proof of retirement certificates and relevant serial numbers' },
  { key: 'E', label: 'Project/facility description', description: 'Description of project' },
  { key: 'F', label: 'Quantity (during reporting period)', description: 'Total number of credits retired from this project in reporting period' },
  { key: 'G', label: 'Vintage', description: 'Credit vintage(s)' },
  { key: 'H', label: 'Location', description: 'Location of project (county and country)' },
  { key: 'I', label: 'Mitigation specific information', description: 'N/A' },
  { key: 'J', label: 'Project or facility commercial operation year', description: 'Year project began generating credits' },
  { key: 'K', label: 'Project or facility fuel and technology types', description: 'Project fuel or feedstock type (if applicable)' },
  { key: 'L', label: 'Methodology', description: 'Name and version of methodology or protocol' },
  { key: 'M', label: 'Entity name', description: 'Name of entity retiring credit' },
  { key: 'N', label: 'Verification body', description: 'Validation verification body (VVB) name or third party assurance provider' },
  { key: 'O', label: 'Verification report', description: 'Link to verification report' },
  { key: 'P', label: 'Other relevant information', description: 'Other relevant data (additional certifications or standards)' },
];

// REC-specific field descriptions
const REC_TCAT_FIELDS: TCATFieldDefinition[] = [
  { key: 'A', label: 'Project name', description: 'Generation facility name (if known)' },
  { key: 'B', label: 'Project/unit ID', description: 'Electricity generation facility ID/registration number (if applicable)' },
  { key: 'C', label: 'Registry', description: 'Registry or program where certificates were issued and retired' },
  { key: 'D', label: 'Proof of retirement', description: 'Link to proof of retirement certificates and relevant serial numbers' },
  { key: 'E', label: 'Project/facility description', description: 'Description of the generation facility (if known)' },
  { key: 'F', label: 'Quantity (during reporting period)', description: 'Total number of credits retired from this project in reporting period' },
  { key: 'G', label: 'Vintage', description: 'Credit vintage(s)' },
  { key: 'H', label: 'Location', description: 'Location of project (electric grid region or country)' },
  { key: 'I', label: 'Mitigation specific information', description: 'Generator emission rate (tonnes CO2e/MWh) and the amount of MWh this emissions rate is associated with' },
  { key: 'J', label: 'Project or facility commercial operation year', description: 'Year facility achieved commercial operation' },
  { key: 'K', label: 'Project or facility fuel and technology types', description: 'Fuel Type (e.g., solar, wind, hydropower)' },
  { key: 'L', label: 'Methodology', description: 'Name and version of methodology or protocol used to calculate avoided emissions from REC-tracked electricity generation' },
  { key: 'M', label: 'Entity name', description: 'Name of entity selling credit (e.g., renewable energy generator operator)' },
  { key: 'N', label: 'Verification body', description: 'Name of verification provider, and verification status' },
  { key: 'O', label: 'Verification report', description: 'Link to verification report' },
  { key: 'P', label: 'Other relevant information', description: 'Other relevant data (additional certifications or standards)' },
];

// RTC-specific field descriptions
const RTC_TCAT_FIELDS: TCATFieldDefinition[] = [
  { key: 'A', label: 'Project name', description: 'Generation facility name (if known)' },
  { key: 'B', label: 'Project/unit ID', description: 'Renewable Thermal Fuel generation facility ID/registration number (if applicable)' },
  { key: 'C', label: 'Registry', description: 'Registry or program where certificates were issued and retired' },
  { key: 'D', label: 'Proof of retirement', description: 'Link to proof of retirement certificates and relevant serial numbers' },
  { key: 'E', label: 'Project/facility description', description: 'Description of the generation facility (if known)' },
  { key: 'F', label: 'Quantity (during reporting period)', description: 'Total number of credits retired in reporting period' },
  { key: 'G', label: 'Vintage', description: 'Credit vintage(s)' },
  { key: 'H', label: 'Location', description: 'Location of project (region or country)' },
  { key: 'I', label: 'Mitigation specific information', description: 'Carbon intensity (CI) score and type (full lifecycle CI, partial lifecycle CI, injection point CI), if applicable and provided for the amount of BTUs this CI score is associated with' },
  { key: 'J', label: 'Project or facility commercial operation year', description: 'Year facility achieved commercial operation' },
  { key: 'K', label: 'Project or facility fuel and technology types', description: 'Fuel feedstock(s)' },
  { key: 'L', label: 'Methodology', description: 'Name and version of methodology or protocol used to determine carbon intensity (CI)' },
  { key: 'M', label: 'Entity name', description: 'Name of entity retiring credit' },
  { key: 'N', label: 'Verification body', description: 'Name of verification provider, and verification status, of CI data' },
  { key: 'O', label: 'Verification report', description: 'Link to verification report' },
  { key: 'P', label: 'Other relevant information', description: 'Other relevant data (additional certifications or standards)' },
];

// SAF-specific field descriptions
const SAF_TCAT_FIELDS: TCATFieldDefinition[] = [
  { key: 'A', label: 'Project name', description: 'Production facility name (if known)' },
  { key: 'B', label: 'Project/unit ID', description: 'Batch number(s) or unit block IDs of the SAF retired' },
  { key: 'C', label: 'Registry', description: 'Registry or program where certificates were issued and retired' },
  { key: 'D', label: 'Proof of retirement', description: 'Link to proof of retirement certificates and relevant serial numbers' },
  { key: 'E', label: 'Project/facility description', description: 'Type of SAFc (sustainable aviation fuel certificate for end users (SAFcE) or sustainable aviation fuel certificate for air transport providers (SAFcA)); description of the fuel production facility (if known)' },
  { key: 'F', label: 'Quantity (during reporting period)', description: 'Total number of credits retired in reporting period' },
  { key: 'G', label: 'Vintage', description: 'Credit vintage(s)' },
  { key: 'H', label: 'Location', description: 'Location of project (county and country)' },
  { key: 'I', label: 'Mitigation specific information', description: 'GHG emissions reduction (mt of CO2e) or GHG core LCA value (gCO2e/MJ) and the corresponding volume (liters or gallons) this LCA value is associated with' },
  { key: 'J', label: 'Project or facility commercial operation year', description: 'Year facility achieved commercial operation' },
  { key: 'K', label: 'Project or facility fuel and technology types', description: 'Feedstock(s)' },
  { key: 'L', label: 'Methodology', description: 'Name and version of methodology or protocol' },
  { key: 'M', label: 'Entity name', description: 'Name of entity retiring the SAFc' },
  { key: 'N', label: 'Verification body', description: 'Certification scheme of the fuel' },
  { key: 'O', label: 'Verification report', description: 'Link to verification report' },
  { key: 'P', label: 'Other relevant information', description: 'Other relevant data (additional certifications or standards)' },
];

// CC-specific field descriptions (Carbon Credits)
const CC_TCAT_FIELDS: TCATFieldDefinition[] = [
  { key: 'A', label: 'Project name', description: 'Project Name' },
  { key: 'B', label: 'Project/unit ID', description: 'Project ID/registration number (if applicable)' },
  { key: 'C', label: 'Registry', description: 'Registry or program where certificates were issued and retired' },
  { key: 'D', label: 'Proof of retirement', description: 'Link to proof of retirement certificates and relevant serial numbers' },
  { key: 'E', label: 'Project/facility description', description: 'Description of project including offset project type (i.e., avoided emission, emission reduction, emission removal, combination)' },
  { key: 'F', label: 'Quantity (during reporting period)', description: 'Total number of credits retired from this project in reporting period' },
  { key: 'G', label: 'Vintage', description: 'Credit vintage(s)' },
  { key: 'H', label: 'Location', description: 'Location of project (county and country)' },
  { key: 'I', label: 'Mitigation specific information', description: 'N/A' },
  { key: 'J', label: 'Project or facility commercial operation year', description: 'Year project began generating credits' },
  { key: 'K', label: 'Project or facility fuel and technology types', description: 'Project fuel or feedstock type (if applicable)' },
  { key: 'L', label: 'Methodology', description: 'Name and version of methodology or protocol' },
  { key: 'M', label: 'Entity name', description: 'Name of entity retiring credit' },
  { key: 'N', label: 'Verification body', description: 'Validation verification body (VVB) name or third party assurance provider' },
  { key: 'O', label: 'Verification report', description: 'Link to verification report' },
  { key: 'P', label: 'Other relevant information', description: 'Other relevant data (additional certifications or standards)' },
];

// Get TCAT fields for a specific EAC type
export function getTCATFieldsForType(type: EACType): TCATFieldDefinition[] {
  switch (type) {
    case EACType.REC:
      return REC_TCAT_FIELDS;
    case EACType.RTC:
      return RTC_TCAT_FIELDS;
    case EACType.SAF:
      return SAF_TCAT_FIELDS;
    case EACType.CC:
      return CC_TCAT_FIELDS;
    default:
      return COMMON_TCAT_FIELDS;
  }
}

// EACType short names for filenames
export const EAC_TYPE_SHORT_NAMES: Record<EACType, string> = {
  [EACType.REC]: 'RE',
  [EACType.RTC]: 'RT',
  [EACType.RNG]: 'RNG',
  [EACType.SAF]: 'SAF',
  [EACType.CC]: 'CC',
};

// Supported TCAT types (RNG is not supported)
export const TCAT_SUPPORTED_TYPES: EACType[] = [
  EACType.REC,
  EACType.RTC,
  EACType.SAF,
  EACType.CC,
];

// Interface for mapped TCAT data
export interface TCATMappedData {
  projectName: string;
  projectId: string;
  registry: string;
  proofOfRetirement: string;
  projectDescription: string;
  quantity: string;
  vintage: string;
  location: string;
  mitigationInfo: string;
  commercialOperationYear: string;
  fuelAndTechnologyTypes: string;
  methodology: string;
  entityName: string;
  verificationBody: string;
  verificationReport: string;
  otherInfo: string;
}

// Extract vintage date range from PRODUCTION events
export function getVintageDateRange(
  certificateId: string,
  events: EventDB[]
): { oldest: Date; newest: Date } | null {
  const productionEvents = events.filter(
    (e) => e.target_id === certificateId && e.type === EACEventType.PRODUCTION
  );

  if (productionEvents.length === 0) return null;

  const dates = productionEvents.flatMap((e) => {
    const result: Date[] = [new Date(e.dates.start)];
    if (e.dates.end) result.push(new Date(e.dates.end));
    return result;
  });

  return {
    oldest: new Date(Math.min(...dates.map((d) => d.getTime()))),
    newest: new Date(Math.max(...dates.map((d) => d.getTime()))),
  };
}

// Format vintage for TCAT display
export function formatVintageForTCAT(
  range: { oldest: Date; newest: Date } | null
): string {
  if (!range) return '';

  const startYear = range.oldest.getFullYear();
  const endYear = range.newest.getFullYear();
  const startQ = Math.ceil((range.oldest.getMonth() + 1) / 3);
  const endQ = Math.ceil((range.newest.getMonth() + 1) / 3);

  if (startYear === endYear) {
    if (startQ === endQ) {
      return `Q${startQ} ${startYear}`;
    }
    return `Q${startQ}-Q${endQ} ${startYear}`;
  }
  return `Q${startQ} ${startYear} - Q${endQ} ${endYear}`;
}

// Format vintage dates for filename (YYYYMMDD-YYYYMMDD)
export function formatVintageDatesForFilename(
  range: { oldest: Date; newest: Date } | null
): string {
  if (!range) {
    const now = new Date();
    return format(now, 'yyyyMMdd') + '-' + format(now, 'yyyyMMdd');
  }
  return format(range.oldest, 'yyyyMMdd') + '-' + format(range.newest, 'yyyyMMdd');
}

// Find organization by role in events
function findOrganizationByRole(
  events: EventDB[],
  organizations: OrganizationDB[],
  role: OrgRoleTypes,
  eventType?: string
): OrganizationDB | undefined {
  const relevantEvents = eventType
    ? events.filter((e) => e.type === eventType)
    : events;

  for (const event of relevantEvents) {
    if (event.organizations) {
      const orgRole = event.organizations.find((o) => o.role === role);
      if (orgRole) {
        return organizations.find((org) => org.id === orgRole.orgId);
      }
    }
  }
  return undefined;
}

// Find links from a specific event type
function findLinksFromEventType(events: EventDB[], eventType: string): string {
  const event = events.find((e) => e.type === eventType && e.links && e.links.length > 0);
  return event?.links?.join('; ') || '';
}

// Map a certificate to TCAT format
export function mapCertificateToTCAT(
  certificate: EACertificateDB,
  productionSource: ProductionSourceDB | null,
  events: EventDB[],
  organizations: OrganizationDB[]
): TCATMappedData {
  // Get vintage from PRODUCTION events
  const vintageRange = getVintageDateRange(certificate.id, events);

  // Find relevant organizations
  const registryOrg = findOrganizationByRole(
    events,
    organizations,
    OrgRoleTypes.REGISTRY,
    EACEventType.REDEMPTION
  );
  const beneficiaryOrg = findOrganizationByRole(
    events,
    organizations,
    OrgRoleTypes.EACBENEFICIARY
  );
  const verifierOrg = findOrganizationByRole(
    events,
    organizations,
    OrgRoleTypes.MRV_VERIFIER,
    EACEventType.VERIFICATION
  );

  // Get proof of retirement links
  const retirementLinks = findLinksFromEventType(events, EACEventType.REDEMPTION);
  const verificationLinks = findLinksFromEventType(events, EACEventType.VERIFICATION);

  // Format quantity
  const primaryAmount = certificate.amounts?.find((a) => a.isPrimary) || certificate.amounts?.[0];
  const quantity = primaryAmount
    ? `${primaryAmount.amount} ${primaryAmount.unit}`
    : '';

  // Format location
  const location = productionSource?.location
    ? [
        productionSource.location.region,
        productionSource.location.country,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  // Format mitigation info (emissions data)
  let mitigationInfo = '';
  if (certificate.emissions && certificate.emissions.length > 0) {
    const emission = certificate.emissions[0];
    mitigationInfo = `${emission.carbonIntensity} ${emission.ciUnit || 'CO2e/MWh'}`;
    if (primaryAmount) {
      mitigationInfo += `, applies to ${primaryAmount.amount} ${primaryAmount.unit}`;
    }
  } else if (certificate.type === EACType.REC) {
    mitigationInfo = '0 CO2e/MWh, applies to all RECs';
  }

  // Format external ID
  const projectId =
    certificate.external_ids?.[0]?.id ||
    productionSource?.external_ids?.[0]?.id ||
    '';

  // Format methodology from labels or metadata
  const methodology =
    productionSource?.labels?.join(', ') ||
    certificate.metadata?.find((m) => m.key === 'methodology')?.value ||
    '';

  // Format other info from metadata and labels
  const otherInfoParts: string[] = [];
  if (productionSource?.labels) {
    otherInfoParts.push(...productionSource.labels);
  }
  if (certificate.metadata) {
    certificate.metadata.forEach((m) => {
      if (m.key !== 'methodology' && m.value) {
        otherInfoParts.push(`${m.label || m.key}: ${m.value}`);
      }
    });
  }

  // Format commercial operation year
  const commercialOperationYear = productionSource?.operation_start_date
    ? new Date(productionSource.operation_start_date).getFullYear().toString()
    : '';

  return {
    projectName: productionSource?.name || '',
    projectId,
    registry: registryOrg?.name || '',
    proofOfRetirement: retirementLinks || certificate.links?.join('; ') || '',
    projectDescription: productionSource?.description || '',
    quantity,
    vintage: formatVintageForTCAT(vintageRange),
    location,
    mitigationInfo,
    commercialOperationYear,
    fuelAndTechnologyTypes: productionSource?.technology?.join(', ') || '',
    methodology,
    entityName: beneficiaryOrg?.name || '',
    verificationBody: verifierOrg?.name || '',
    verificationReport: verificationLinks,
    otherInfo: otherInfoParts.join('; '),
  };
}

// Transpose mapped data to TCAT format (rows become columns)
export function transposeToTCATFormat(
  mappedData: TCATMappedData[],
  fieldDefinitions: TCATFieldDefinition[]
): string[][] {
  // Create header row: Disclosure Category, Description, Project 1, Project 2, ...
  const headers = ['Disclosure Category', 'Description'];
  mappedData.forEach((_, index) => {
    headers.push(`Project ${index + 1}`);
  });

  // Map field keys to TCATMappedData properties
  const fieldToPropertyMap: Record<string, keyof TCATMappedData> = {
    A: 'projectName',
    B: 'projectId',
    C: 'registry',
    D: 'proofOfRetirement',
    E: 'projectDescription',
    F: 'quantity',
    G: 'vintage',
    H: 'location',
    I: 'mitigationInfo',
    J: 'commercialOperationYear',
    K: 'fuelAndTechnologyTypes',
    L: 'methodology',
    M: 'entityName',
    N: 'verificationBody',
    O: 'verificationReport',
    P: 'otherInfo',
  };

  // Create data rows
  const rows: string[][] = [headers];

  fieldDefinitions.forEach((field) => {
    const row: string[] = [
      `${field.key}. ${field.label}`,
      field.description,
    ];

    const propertyName = fieldToPropertyMap[field.key];
    mappedData.forEach((data) => {
      row.push(propertyName ? data[propertyName] : '');
    });

    rows.push(row);
  });

  return rows;
}

// Generate CSV content from transposed data
export function generateTCATCSVContent(rows: string[][]): string {
  const escapeCSV = (value: string): string => {
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  return rows.map((row) => row.map((cell) => escapeCSV(cell)).join(',')).join('\n');
}

// Generate TCAT filename
export function generateTCATFilename(
  eacType: EACType,
  vintageRange: { oldest: Date; newest: Date } | null
): string {
  const shortName = EAC_TYPE_SHORT_NAMES[eacType];
  const vintageDates = formatVintageDatesForFilename(vintageRange);
  return `PEACH_${shortName}_vintage-${vintageDates}.csv`;
}

// Generate ZIP filename
export function generateTCATZipFilename(): string {
  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  return `PEACH_export_forTCAT_${timestamp}.zip`;
}

// Export progress interface
export interface TCATExportProgress {
  step: 'collecting' | 'mapping' | 'generating' | 'zipping' | 'downloading';
  message: string;
}

// Main TCAT export function
export async function exportForTCAT(
  certificates: EACertificateDB[],
  fetchRelatedData: (
    certIds: string[],
    psIds: string[]
  ) => Promise<{
    productionSources: ProductionSourceDB[];
    events: EventDB[];
    organizations: OrganizationDB[];
  }>,
  onProgress?: (progress: TCATExportProgress) => void
): Promise<void> {
  // Filter out RNG certificates (not supported by TCAT)
  const supportedCertificates = certificates.filter((cert) =>
    TCAT_SUPPORTED_TYPES.includes(cert.type)
  );

  if (supportedCertificates.length === 0) {
    const hasRngOnly = certificates.every((cert) => cert.type === EACType.RNG);
    if (hasRngOnly) {
      alert('RNG certificates are not supported by TCAT export. Please select other certificate types.');
    } else {
      alert('No certificates to export');
    }
    return;
  }

  try {
    // Step 1: Collect related data
    onProgress?.({ step: 'collecting', message: 'Collecting related data...' });

    const certIds = supportedCertificates.map((c) => c.id);
    const psIds = supportedCertificates
      .map((c) => c.production_source_id)
      .filter((id): id is string => id !== null);

    const { productionSources, events, organizations } = await fetchRelatedData(
      certIds,
      [...new Set(psIds)]
    );

    // Create lookup maps
    const psMap = new Map(productionSources.map((ps) => [ps.id, ps]));

    // Step 2: Group certificates by type
    const certsByType = new Map<EACType, EACertificateDB[]>();
    supportedCertificates.forEach((cert) => {
      const existing = certsByType.get(cert.type) || [];
      existing.push(cert);
      certsByType.set(cert.type, existing);
    });

    // Step 3: Map and generate CSV for each type
    onProgress?.({ step: 'mapping', message: 'Mapping data to TCAT format...' });

    const csvFiles: { name: string; content: string }[] = [];

    for (const [type, typeCerts] of certsByType) {
      // Get events for these certificates
      const typeEvents = events.filter((e) =>
        typeCerts.some((c) => c.id === e.target_id)
      );

      // Map each certificate to TCAT format
      const mappedData = typeCerts.map((cert) => {
        const ps = cert.production_source_id
          ? psMap.get(cert.production_source_id) || null
          : null;
        const certEvents = typeEvents.filter((e) => e.target_id === cert.id);
        return mapCertificateToTCAT(cert, ps, certEvents, organizations);
      });

      // Get vintage range for all certificates of this type
      const allVintageRanges = typeCerts
        .map((cert) => getVintageDateRange(cert.id, typeEvents))
        .filter((r): r is { oldest: Date; newest: Date } => r !== null);

      const overallVintageRange =
        allVintageRanges.length > 0
          ? {
              oldest: new Date(
                Math.min(...allVintageRanges.map((r) => r.oldest.getTime()))
              ),
              newest: new Date(
                Math.max(...allVintageRanges.map((r) => r.newest.getTime()))
              ),
            }
          : null;

      // Get field definitions for this type
      const fieldDefs = getTCATFieldsForType(type);

      // Transpose data
      const transposedData = transposeToTCATFormat(mappedData, fieldDefs);

      // Generate CSV content
      onProgress?.({ step: 'generating', message: `Generating ${EAC_TYPE_SHORT_NAMES[type]} CSV...` });
      const csvContent = generateTCATCSVContent(transposedData);

      // Generate filename
      const filename = generateTCATFilename(type, overallVintageRange);

      csvFiles.push({ name: filename, content: csvContent });
    }

    // Step 4: Create ZIP
    onProgress?.({ step: 'zipping', message: 'Creating ZIP file...' });

    const zip = new JSZip();
    csvFiles.forEach((file) => {
      zip.file(file.name, file.content);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Step 5: Download
    onProgress?.({ step: 'downloading', message: 'Downloading...' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(zipBlob);
    link.setAttribute('href', url);
    link.setAttribute('download', generateTCATZipFilename());
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting for TCAT:', error);
    throw error;
  }
}
