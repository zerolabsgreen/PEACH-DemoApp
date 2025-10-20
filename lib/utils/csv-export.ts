import { EACertificateDB, EventDB, OrganizationDB, ProductionSourceDB } from '@/lib/types/eacertificate';
import { EAC_TYPE_NAMES, EVENT_TARGET_NAMES } from '@/lib/types/eacertificate';
import { format } from 'date-fns';

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
    
    // Format organizations
    if (cert.organizations && Array.isArray(cert.organizations)) {
      flattened.organizations_summary = cert.organizations.map((org: any) => 
        `${org.orgName || org.orgId} (${org.role})`
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
      if (event.location.city) locationParts.push(event.location.city);
      if (event.location.state) locationParts.push(event.location.state);
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
        if (loc.city) locationParts.push(loc.city);
        if (loc.state) locationParts.push(loc.state);
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
      if (source.location.city) locationParts.push(source.location.city);
      if (source.location.state) locationParts.push(source.location.state);
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

// Helper function to generate filename with timestamp
export function generateCSVFilename(entityType: string, filters?: Record<string, any>): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filterSuffix = filters ? '_filtered' : '';
  return `${entityType}${filterSuffix}_${timestamp}.csv`;
}
