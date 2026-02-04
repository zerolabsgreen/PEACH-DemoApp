import { EACertificateDB, EventDB, OrganizationDB, ProductionSourceDB } from '@/lib/types/eacertificate';
import { EAC_TYPE_NAMES, EVENT_TARGET_NAMES } from '@/lib/types/eacertificate';
import { format } from 'date-fns';
import JSZip from 'jszip';

// Generic CSV export function that flattens complex objects
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};
  
  for (const key in obj) {
    if (obj[key] === null || obj[key] === undefined) {
      flattened[prefix + key] = '';
      continue;
    }
    
    if (Array.isArray(obj[key])) {
      if (obj[key].length === 0) {
        flattened[prefix + key] = '';
      } else if (typeof obj[key][0] === 'object') {
        // Handle array of objects
        obj[key].forEach((item: any, index: number) => {
          const itemPrefix = `${prefix}${key}_${index + 1}_`;
          Object.assign(flattened, flattenObject(item, itemPrefix));
        });
      } else {
        // Handle array of primitives
        flattened[prefix + key] = obj[key].join('; ');
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Handle nested objects
      Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}_`));
    } else if (obj[key] instanceof Date) {
      flattened[prefix + key] = format(obj[key], 'yyyy-MM-dd HH:mm:ss');
    } else {
      flattened[prefix + key] = String(obj[key]);
    }
  }
  
  return flattened;
}

// Format specific data types for better CSV readability
function formatEACertificateData(data: EACertificateDB[]): Record<string, string>[] {
  return data.map(cert => {
    const flattened = flattenObject(cert);
    
    // Add human-readable type names
    flattened.type_name = EAC_TYPE_NAMES[cert.type] || cert.type;
    
    // Format amounts array for better readability
    if (cert.amounts && Array.isArray(cert.amounts)) {
      flattened.amounts_summary = cert.amounts.map(amount => 
        `${amount.amount} ${amount.unit}${amount.isPrimary ? ' (Primary)' : ''}`
      ).join('; ');
    }
    
    // Format emissions data
    if (cert.emissions && Array.isArray(cert.emissions)) {
      flattened.emissions_summary = cert.emissions.map(emission =>
        `CI: ${emission.carbonIntensity} ${emission.ciUnit || ''}, EF: ${emission.emissionsFactor} ${emission.efUnit || ''}`
      ).join('; ');
    }

    return flattened;
  });
}

function formatEventData(data: EventDB[]): Record<string, string>[] {
  return data.map(event => {
    const flattened = flattenObject(event);
    
    // Add human-readable target names
    flattened.target_name = EVENT_TARGET_NAMES[event.target] || event.target;
    
    // Format dates
    if (event.dates) {
      flattened.start_date = event.dates.start ? format(new Date(event.dates.start), 'yyyy-MM-dd') : '';
      flattened.end_date = event.dates.end ? format(new Date(event.dates.end), 'yyyy-MM-dd') : '';
    }
    
    // Format organizations
    if (event.organizations && Array.isArray(event.organizations)) {
      flattened.organizations_summary = event.organizations.map((org: any) => 
        `${org.orgName || org.orgId} (${org.role})`
      ).join('; ');
    }
    
    // Format location
    if (event.location) {
      const locationParts = [];
      if (event.location.address) locationParts.push(event.location.address);
      if (event.location.subdivision) locationParts.push(event.location.subdivision);
      if (event.location.region) locationParts.push(event.location.region);
      if (event.location.country) locationParts.push(event.location.country);
      flattened.location_summary = locationParts.join(', ');
    }
    
    return flattened;
  });
}

function formatOrganizationData(data: OrganizationDB[]): Record<string, string>[] {
  return data.map(org => {
    const flattened = flattenObject(org);
    
    // Format locations
    if (org.location && Array.isArray(org.location)) {
      flattened.locations_summary = org.location.map(loc => {
        const locationParts = [];
        if (loc.address) locationParts.push(loc.address);
        if (loc.subdivision) locationParts.push(loc.subdivision);
        if (loc.region) locationParts.push(loc.region);
        if (loc.country) locationParts.push(loc.country);
        return locationParts.join(', ');
      }).join('; ');
    }
    
    // Format external IDs
    if (org.external_ids && Array.isArray(org.external_ids)) {
      flattened.external_ids_summary = org.external_ids.map((ext: any) => 
        `${ext.externalFieldName || 'ID'}: ${ext.id}${ext.description ? ` (${ext.description})` : ''}`
      ).join('; ');
    }
    
    return flattened;
  });
}

function formatProductionSourceData(data: any[]): Record<string, string>[] {
  return data.map(source => {
    const flattened = flattenObject(source);
    
    // Format location
    if (source.location) {
      const locationParts = [];
      if (source.location.address) locationParts.push(source.location.address);
      if (source.location.subdivision) locationParts.push(source.location.subdivision);
      if (source.location.region) locationParts.push(source.location.region);
      if (source.location.country) locationParts.push(source.location.country);
      flattened.location_summary = locationParts.join(', ');
    }
    
    // Format organizations
    if (source.organizations && Array.isArray(source.organizations)) {
      flattened.organizations_summary = source.organizations.map((org: any) => 
        `${org.orgName || org.orgId} (${org.role})`
      ).join('; ');
    }
    
    // Format external IDs
    if (source.external_ids && Array.isArray(source.external_ids)) {
      flattened.external_ids_summary = source.external_ids.map((ext: any) => 
        `${ext.externalFieldName || 'ID'}: ${ext.id}${ext.description ? ` (${ext.description})` : ''}`
      ).join('; ');
    }
    
    // Format related production sources
    if (source.related_production_sources && Array.isArray(source.related_production_sources)) {
      flattened.related_sources_summary = source.related_production_sources.join('; ');
    }
    
    return flattened;
  });
}

// Browser-compatible CSV export function
export async function exportToCSV<T extends EACertificateDB | EventDB | OrganizationDB | ProductionSourceDB | any>(
  data: T[],
  filename: string,
  entityType: 'eacertificates' | 'events' | 'organizations' | 'production-sources'
): Promise<void> {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  let formattedData: Record<string, string>[];
  
  switch (entityType) {
    case 'eacertificates':
      formattedData = formatEACertificateData(data as EACertificateDB[]);
      break;
    case 'events':
      formattedData = formatEventData(data as EventDB[]);
      break;
    case 'organizations':
      formattedData = formatOrganizationData(data as OrganizationDB[]);
      break;
    case 'production-sources':
      formattedData = formatProductionSourceData(data as any[]);
      break;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }

  // Get all unique keys from all objects to create headers
  const allKeys = new Set<string>();
  formattedData.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key));
  });

  const headers = Array.from(allKeys);
  
  // Create CSV content
  const csvContent = createCSVContent(formattedData, headers);
  
  // Trigger download
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for older browsers
      const csvData = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      window.open(csvData);
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Error exporting CSV. Please try again.');
  }
}

// Helper function to create CSV content
function createCSVContent(data: Record<string, string>[], headers: string[]): string {
  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Create header row
  const headerRow = headers.map(header => 
    escapeCSV(header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
  ).join(',');

  // Create data rows
  const dataRows = data.map(row => 
    headers.map(header => escapeCSV(row[header] || '')).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

// EACType short names for filenames
const EAC_TYPE_SHORT_NAMES: Record<string, string> = {
  'REC': 'RE',
  'RTC': 'RT',
  'RNG': 'RNG',
  'SAF': 'SAF',
  'CC': 'CC',
};

// Helper function to extract vintage date range from certificates
export function getVintageDateRangeFromCertificates(
  certificates: EACertificateDB[]
): { oldest: Date; newest: Date } | null {
  const dates: Date[] = [];

  certificates.forEach((cert) => {
    // Try to use created_at as a proxy for vintage if no events are available
    if (cert.created_at) {
      dates.push(new Date(cert.created_at));
    }
  });

  if (dates.length === 0) return null;

  return {
    oldest: new Date(Math.min(...dates.map((d) => d.getTime()))),
    newest: new Date(Math.max(...dates.map((d) => d.getTime()))),
  };
}

// Format vintage dates for filename (YYYYMMDD-YYYYMMDD)
function formatVintageDatesForFilename(
  range: { oldest: Date; newest: Date } | null
): string {
  if (!range) {
    const now = new Date();
    return format(now, 'yyyyMMdd') + '-' + format(now, 'yyyyMMdd');
  }
  return format(range.oldest, 'yyyyMMdd') + '-' + format(range.newest, 'yyyyMMdd');
}

// Helper function to generate filename with timestamp (legacy format)
export function generateCSVFilename(entityType: string, filters?: Record<string, any>): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filterSuffix = filters ? '_filtered' : '';
  return `${entityType}${filterSuffix}_${timestamp}.csv`;
}

// Generate filename with PEACH naming convention
// Format: PEACH_[EACType]_vintage-[YYYYMMDD]-[YYYYMMDD]_[EntityName].csv
export function generatePEACHFilename(
  entityType: 'eacertificates' | 'events' | 'organizations' | 'production-sources',
  eacType?: string,
  vintageRange?: { oldest: Date; newest: Date } | null
): string {
  const entityNames: Record<string, string> = {
    'eacertificates': 'Certificates',
    'events': 'Events',
    'organizations': 'Organizations',
    'production-sources': 'ProductionSources',
  };

  const shortType = eacType && EAC_TYPE_SHORT_NAMES[eacType] ? EAC_TYPE_SHORT_NAMES[eacType] : '';
  const vintageDates = formatVintageDatesForFilename(vintageRange || null);
  const entityName = entityNames[entityType] || entityType;

  if (shortType) {
    return `PEACH_${shortType}_vintage-${vintageDates}_${entityName}.csv`;
  }

  // Fallback for mixed types or no type specified
  return `PEACH_vintage-${vintageDates}_${entityName}.csv`;
}

// Generate CSV content as string without triggering download
export function generateCSVContent<T extends EACertificateDB | EventDB | OrganizationDB | ProductionSourceDB | any>(
  data: T[],
  entityType: 'eacertificates' | 'events' | 'organizations' | 'production-sources'
): string {
  if (data.length === 0) {
    return '';
  }

  let formattedData: Record<string, string>[];

  switch (entityType) {
    case 'eacertificates':
      formattedData = formatEACertificateData(data as EACertificateDB[]);
      break;
    case 'events':
      formattedData = formatEventData(data as EventDB[]);
      break;
    case 'organizations':
      formattedData = formatOrganizationData(data as OrganizationDB[]);
      break;
    case 'production-sources':
      formattedData = formatProductionSourceData(data as any[]);
      break;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }

  const allKeys = new Set<string>();
  formattedData.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key));
  });

  const headers = Array.from(allKeys);
  return createCSVContent(formattedData, headers);
}

// Extract unique production source IDs from certificates
export function extractProductionSourceIds(certificates: EACertificateDB[]): string[] {
  const ids = new Set<string>();
  certificates.forEach(cert => {
    const psId = (cert as any).production_source_id ?? (cert as any).productionSourceId;
    if (psId) {
      ids.add(psId);
    }
  });
  return Array.from(ids);
}

// Extract unique organization IDs from OrganizationRole arrays
export function extractOrganizationIds(
  productionSources: ProductionSourceDB[],
  events: EventDB[]
): string[] {
  const orgIds = new Set<string>();

  productionSources.forEach(ps => {
    if (ps.organizations && Array.isArray(ps.organizations)) {
      ps.organizations.forEach((org: any) => {
        if (org.orgId) {
          orgIds.add(org.orgId);
        }
      });
    }
  });

  events.forEach(event => {
    if (event.organizations && Array.isArray(event.organizations)) {
      event.organizations.forEach((org: any) => {
        if (org.orgId) {
          orgIds.add(org.orgId);
        }
      });
    }
  });

  return Array.from(orgIds);
}

export interface ExportProgress {
  step: 'collecting' | 'generating' | 'zipping' | 'downloading';
  message: string;
}

// Export certificates and all related entities as a ZIP file
export async function exportRelatedEntitiesAsZip(
  certificates: EACertificateDB[],
  fetchRelatedData: (
    certIds: string[],
    psIds: string[]
  ) => Promise<{
    productionSources: ProductionSourceDB[];
    events: EventDB[];
    organizations: OrganizationDB[];
  }>,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> {
  if (certificates.length === 0) {
    alert('No certificates to export');
    return;
  }

  try {
    // Step 1: Collect related data
    onProgress?.({ step: 'collecting', message: 'Collecting related data...' });

    const certIds = certificates.map(c => c.id);
    const psIds = extractProductionSourceIds(certificates);

    const { productionSources, events, organizations } = await fetchRelatedData(certIds, psIds);

    // Step 2: Generate CSV content
    onProgress?.({ step: 'generating', message: 'Generating CSV files...' });

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');

    const csvFiles: { name: string; content: string }[] = [];

    // Always include certificates
    const certCSV = generateCSVContent(certificates, 'eacertificates');
    if (certCSV) {
      csvFiles.push({ name: `eacertificates_${timestamp}.csv`, content: certCSV });
    }

    // Include production sources if any
    if (productionSources.length > 0) {
      const psCSV = generateCSVContent(productionSources, 'production-sources');
      if (psCSV) {
        csvFiles.push({ name: `production_sources_${timestamp}.csv`, content: psCSV });
      }
    }

    // Include events if any
    if (events.length > 0) {
      const eventsCSV = generateCSVContent(events, 'events');
      if (eventsCSV) {
        csvFiles.push({ name: `events_${timestamp}.csv`, content: eventsCSV });
      }
    }

    // Include organizations if any
    if (organizations.length > 0) {
      const orgsCSV = generateCSVContent(organizations, 'organizations');
      if (orgsCSV) {
        csvFiles.push({ name: `organizations_${timestamp}.csv`, content: orgsCSV });
      }
    }

    // Step 3: Create ZIP
    onProgress?.({ step: 'zipping', message: 'Creating ZIP file...' });

    const zip = new JSZip();
    csvFiles.forEach(file => {
      zip.file(file.name, file.content);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Step 4: Download
    onProgress?.({ step: 'downloading', message: 'Downloading...' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(zipBlob);
    link.setAttribute('href', url);
    link.setAttribute('download', `eac_export_${timestamp}.zip`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error exporting related entities:', error);
    throw error;
  }
}
