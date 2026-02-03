import { createClientComponentClient } from '@/lib/supabase'

export type Organization = {
  id: string
  name: string
  created_at: string
  location?: any[] | null
}

export type OrganizationMember = {
  org_id: string
  user_id: string
  role: 'admin' | 'member'
  created_at: string
}

export type OrganizationInvitation = {
  id: string
  org_id: string
  email: string
  invited_by: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  token: string
  created_at: string
  responded_at: string | null
}

export function getSupabase() {
  return createClientComponentClient()
}

export async function createOrganizationFull(body: any) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')
  const payload = {
    name: body.name,
    name_expanded: body.nameExpanded || null,
    url: body.url || null,
    description: body.description || null,
    contacts: body.contacts || null,
    location: body.location ? [body.location] : null,
    external_ids: Array.isArray(body.externalIDs) ? body.externalIDs : null,
  }
  const { data, error } = await supabase
    .from('organizations')
    .insert(payload)
    .select('id, name, created_at')
    .single()
  if (error) throw error
  return data as any
}

export async function listMyOrganizations() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(*))')
  if (error) throw error
  return data as any
}

/**
 * Computes the most common role for each organization by querying all tables
 * that contain organization roles (eacertificates, events, documents, production_sources)
 */
async function computeOrganizationMainRoles(): Promise<Record<string, string>> {
  const supabase = getSupabase()
  const roleCounts: Record<string, Record<string, number>> = {}

  // Query all tables that have organizations field
  const [certificates, events, documents, productionSources] = await Promise.all([
    supabase.from('eacertificates').select('organizations'),
    supabase.from('events').select('organizations'),
    supabase.from('documents').select('organizations'),
    supabase.from('production_sources').select('organizations'),
  ])

  // Count roles from certificates
  if (certificates.data) {
    certificates.data.forEach((cert: any) => {
      if (Array.isArray(cert.organizations)) {
        cert.organizations.forEach((org: any) => {
          if (org?.orgId && org?.role) {
            const orgId = org.orgId
            if (!roleCounts[orgId]) {
              roleCounts[orgId] = {}
            }
            roleCounts[orgId][org.role] = (roleCounts[orgId][org.role] || 0) + 1
          }
        })
      }
    })
  }

  // Count roles from events
  if (events.data) {
    events.data.forEach((event: any) => {
      if (Array.isArray(event.organizations)) {
        event.organizations.forEach((org: any) => {
          if (org?.orgId && org?.role) {
            const orgId = org.orgId
            if (!roleCounts[orgId]) {
              roleCounts[orgId] = {}
            }
            roleCounts[orgId][org.role] = (roleCounts[orgId][org.role] || 0) + 1
          }
        })
      }
    })
  }

  // Count roles from documents
  if (documents.data) {
    documents.data.forEach((doc: any) => {
      if (Array.isArray(doc.organizations)) {
        doc.organizations.forEach((org: any) => {
          if (org?.orgId && org?.role) {
            const orgId = org.orgId
            if (!roleCounts[orgId]) {
              roleCounts[orgId] = {}
            }
            roleCounts[orgId][org.role] = (roleCounts[orgId][org.role] || 0) + 1
          }
        })
      }
    })
  }

  // Count roles from production sources
  if (productionSources.data) {
    productionSources.data.forEach((ps: any) => {
      if (Array.isArray(ps.organizations)) {
        ps.organizations.forEach((org: any) => {
          if (org?.orgId && org?.role) {
            const orgId = org.orgId
            if (!roleCounts[orgId]) {
              roleCounts[orgId] = {}
            }
            roleCounts[orgId][org.role] = (roleCounts[orgId][org.role] || 0) + 1
          }
        })
      }
    })
  }

  // Find the most common role for each organization
  const mainRoles: Record<string, string> = {}
  Object.keys(roleCounts).forEach((orgId) => {
    const counts = roleCounts[orgId]
    let maxCount = 0
    let mostCommonRole = ''
    
    Object.keys(counts).forEach((role) => {
      if (counts[role] > maxCount) {
        maxCount = counts[role]
        mostCommonRole = role
      }
    })
    
    if (mostCommonRole) {
      mainRoles[orgId] = mostCommonRole
    }
  })

  return mainRoles
}

export async function listOrganizationsWithRole() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, name_expanded, created_at, location, external_ids, contacts')
  if (error) throw error

  // Compute main roles for all organizations
  const mainRoles = await computeOrganizationMainRoles()

  return (data ?? []).map((row: any) => ({
    organizations: {
      ...row,
      mainRole: mainRoles[row.id] || null
    }
  })) as any
}

export async function getOrganization(id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as any
}

export async function getOrganizationsByIds(ids: string[]) {
  if (ids.length === 0) return []
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .in('id', ids)
  if (error) throw error
  return data as any[]
}

export async function inviteToOrganization(orgId: string, email: string) {
  throw new Error('Invitations feature is disabled')
}

export async function listMyInvitations() {
  return []
}

export async function acceptInvitation(token: string) {
  throw new Error('Invitations feature is disabled')
}

export async function rejectInvitation(token: string) {
  throw new Error('Invitations feature is disabled')
}

export async function updateOrganization(id: string, body: any) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const payload: any = {}
  if (body.name !== undefined) payload.name = body.name
  if (body.nameExpanded !== undefined) payload.name_expanded = body.nameExpanded
  if (body.url !== undefined) payload.url = body.url
  if (body.description !== undefined) payload.description = body.description
  if (body.contacts !== undefined) payload.contacts = body.contacts
  if (body.location !== undefined) payload.location = body.location ? [body.location] : null
  if (body.externalIDs !== undefined) payload.external_ids = body.externalIDs
  if (body.documents !== undefined) payload.documents = body.documents && body.documents.length > 0 ? body.documents.map((doc: any) => doc.id).filter(Boolean) : null

  const { data, error } = await supabase
    .from('organizations')
    .update(payload)
    .eq('id', id)
    .select('id, name, created_at')
    .single()

  if (error) throw error
  return data as any
}

export async function deleteOrganization(id: string) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}


