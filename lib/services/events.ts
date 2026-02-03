import { createClientComponentClient } from '@/lib/supabase'
import type { 
  EventDB,
  CreateEventData,
  UpdateEventData,
  EventTarget,
} from '@/lib/types/eacertificate'

export function getSupabase() {
  return createClientComponentClient()
}

export async function createEvent(body: CreateEventData) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const payload = {
    target: body.target as EventTarget,
    target_id: body.targetId,
    type: body.type,
    value: body.value ?? null,
    dates: body.dates ? { start: body.dates.start?.toISOString?.() ?? body.dates.start as any, end: body.dates.end ? (body.dates.end as Date).toISOString?.() ?? body.dates.end as any : undefined } : null,
    location: body.location ?? null,
    organizations: body.organizations ?? null,
    notes: body.notes ?? null,
    documents: body.documents && body.documents.length > 0 ? body.documents.map(d => d.id).filter(Boolean) : null,
    links: body.links ?? null,
    metadata: body.metadata ?? null,
  }

  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as EventDB
}

export async function listEvents() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as EventDB[]
}

export async function listEventsByTarget(target: EventTarget, targetId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('target', target)
    .eq('target_id', targetId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EventDB[]
}

export async function listEventsByTargetIds(target: EventTarget, targetIds: string[]) {
  if (targetIds.length === 0) return []
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('target', target)
    .in('target_id', targetIds)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EventDB[]
}

export async function getEvent(id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as EventDB
}

export async function updateEvent(id: string, body: UpdateEventData) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const payload: any = {}
  if (body.target !== undefined) payload.target = body.target
  if (body.targetId !== undefined) payload.target_id = body.targetId
  if (body.type !== undefined) payload.type = body.type
  if (body.value !== undefined) payload.value = body.value
  if (body.dates !== undefined) {
    payload.dates = body.dates
      ? {
          start: body.dates.start ? (body.dates.start as Date).toISOString?.() ?? (body.dates.start as any) : undefined,
          end: body.dates.end ? (body.dates.end as Date).toISOString?.() ?? (body.dates.end as any) : undefined,
        }
      : null
  }
  if (body.location !== undefined) payload.location = body.location
  if (body.organizations !== undefined) payload.organizations = body.organizations
  if (body.notes !== undefined) payload.notes = body.notes
  if (body.documents !== undefined) payload.documents = body.documents && body.documents.length > 0 ? body.documents.map(d => d.id).filter(Boolean) : null
  if (body.links !== undefined) payload.links = body.links
  if (body.metadata !== undefined) payload.metadata = body.metadata

  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as EventDB
}

export async function deleteEvent(id: string) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}


