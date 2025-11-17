import type { ProductionSourceDB, OrganizationDB } from '@/lib/types/eacertificate'
import { formatOrganizationRole, type OrganizationRole } from '@/lib/types/eacertificate'

/**
 * Formats a production source object into a display label
 * Format: "Name - Country - Technology"
 */
export function formatProductionSourceLabel(productionSource: ProductionSourceDB | { id: string; name: string | null } | null): string {
  if (!productionSource) {
    return 'Unknown Production Source'
  }

  // Handle minimal production source objects (from selectors)
  if ('name' in productionSource && !('location' in productionSource)) {
    return productionSource.name || `Source ${productionSource.id.slice(0, 8)}...`
  }

  // Handle full production source objects
  const fullPs = productionSource as ProductionSourceDB
  const name = fullPs.name || `Source ${fullPs.id.slice(0, 8)}...`
  const country = '- ' + (fullPs.location?.country || '')
  const technology = '- ' + (fullPs.technology || '')
  const firstExternalId = fullPs.external_ids && fullPs.external_ids.length > 0 
    ? '- ' + fullPs.external_ids[0].id 
    : null

  return `${name} ${country} ${technology} ${firstExternalId}`
}

/**
 * Formats a production source object into a short display label (just name)
 * Used when space is limited
 */
export function formatProductionSourceShortLabel(productionSource: ProductionSourceDB | { id: string; name: string | null } | null): string {
  if (!productionSource) {
    return 'Unknown Production Source'
  }

  return productionSource.name || `Source ${productionSource.id.slice(0, 8)}...`
}

/**
 * Formats an organization object into a display label
 * Format: "Name" or "Name - ExternalID" if external ID exists
 * If mainRole is provided, it will be displayed: "Name (Role)" or "Name - ExternalID (Role)"
 */
export function formatOrganizationLabel(organization: OrganizationDB | { id: string; name: string | null; mainRole?: string | null; external_ids?: any[] | null } | null): string {
  if (!organization) {
    return 'Unknown Organization'
  }

  const name = organization.name || `Organization ${organization.id.slice(0, 8)}...`
  
  // Add first external ID if it exists
  const firstExternalId = 'external_ids' in organization && organization.external_ids && organization.external_ids.length > 0
    ? '- ' + organization.external_ids[0].id 
    : null

  // Add main role if it exists
  const mainRole = 'mainRole' in organization && organization.mainRole 
    ? formatOrganizationRole({ orgId: organization.id, role: organization.mainRole } as OrganizationRole)
    : null

  const baseLabel = firstExternalId ? `${name} ${firstExternalId}` : name
  return mainRole ? `${baseLabel} (${mainRole})` : baseLabel
}

/**
 * Formats an organization object into a short display label (just name)
 * Used when space is limited
 */
export function formatOrganizationShortLabel(organization: OrganizationDB | { id: string; name: string | null } | null): string {
  if (!organization) {
    return 'Unknown Organization'
  }

  return organization.name || `Organization ${organization.id.slice(0, 8)}...`
}
