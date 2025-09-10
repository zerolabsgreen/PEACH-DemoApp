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
    url: body.url || null,
    description: body.description || null,
    contact: body.contact ?? body.contact ?? null,
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

export async function listOrganizationsWithRole() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, created_at, location')
  if (error) throw error
  return (data ?? []).map((row: any) => ({ organizations: row })) as any
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


