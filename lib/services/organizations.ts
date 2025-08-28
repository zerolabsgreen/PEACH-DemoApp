import { createClientComponentClient } from '@/lib/supabase'

export type Organization = {
  id: string
  name: string
  owner_id: string
  created_at: string
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

export async function createOrganization(name: string) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, owner_id: user.id })
    .select('*')
    .single()
  if (error) throw error
  return data as Organization
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
    contacts: body.contacts || null,
    external_ids: body.external_ids?.length ? body.external_ids : null,
    location: body.location || null,
    documents: body.documents?.length ? body.documents : null,
    owner_id: user.id,
  }
  const { data, error } = await supabase
    .from('organizations')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data as Organization
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
    .from('organization_members')
    .select('role, organizations:org_id(id, name, owner_id, created_at)')
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    role: row.role as 'admin' | 'member',
    organizations: row.organizations as Organization,
  })) as { role: 'admin' | 'member'; organizations: Organization }[]
}

export async function inviteToOrganization(orgId: string, email: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({ org_id: orgId, email })
    .select('*')
    .single()
  if (error) throw error
  return data as OrganizationInvitation
}

export async function listMyInvitations() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('*, organizations:org_id(id, name)')
    .eq('status', 'pending')
  if (error) throw error
  return data as any
}

export async function acceptInvitation(token: string) {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('accept_invitation', { p_token: token })
  if (error) throw error
}

export async function rejectInvitation(token: string) {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('reject_invitation', { p_token: token })
  if (error) throw error
}


