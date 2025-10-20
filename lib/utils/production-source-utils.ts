import type { ProductionSourceDB, OrganizationDB } from '@/lib/types/eacertificate'

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
 */
export function formatOrganizationLabel(organization: OrganizationDB | { id: string; name: string | null } | null): string {
  if (!organization) {
    return 'Unknown Organization'
  }

  // Handle minimal organization objects (from selectors)
  if ('name' in organization && !('external_ids' in organization)) {
    return organization.name || `Organization ${organization.id.slice(0, 8)}...`
  }

  // Handle full organization objects
  const fullOrg = organization as OrganizationDB
  const name = fullOrg.name || `Organization ${fullOrg.id.slice(0, 8)}...`
  
  // Add first external ID if it exists
  const firstExternalId = fullOrg.external_ids && fullOrg.external_ids.length > 0 
    ? '- ' + fullOrg.external_ids[0].id 
    : null

  return firstExternalId ? `${name} ${firstExternalId}` : name
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
