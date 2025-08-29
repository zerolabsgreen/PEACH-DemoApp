import { createClientComponentClient } from '@/lib/supabase'
import type { ProductionSourceDB, CreateProductionSourceData, UpdateProductionSourceData } from '@/lib/types/eacertificate'

export type ProductionSource = {
  id: string
  name: string | null
  description: string | null
  technology: string
  created_at: string
}

export function getSupabase() {
  return createClientComponentClient()
}

export async function createProductionSource(body: CreateProductionSourceData) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const payload = {
    name: body.name || null,
    description: body.description || null,
    location: body.location,
    technology: body.technology,
    links: body.links || null,
    documents: body.documents && body.documents.length > 0 ? body.documents.map(doc => doc.docId).filter(Boolean) : null,
    external_ids: body.externalIDs || null,
    related_production_sources: body.relatedProductionSourcesIds || null,
    organizations: body.organizations || null,
    metadata: body.metadata || null,
    events: body.events || null,
  }

  const { data, error } = await supabase
    .from('production_sources')
    .insert(payload)
    .select('id, name, description, technology, created_at')
    .single()

  if (error) throw error
  return data as any
}

export async function listProductionSources() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('production_sources')
    .select('id, name, description, technology, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ProductionSource[]
}

export async function getProductionSource(id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('production_sources')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ProductionSourceDB
}

export async function updateProductionSource(id: string, body: UpdateProductionSourceData) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const payload: any = {}
  if (body.name !== undefined) payload.name = body.name
  if (body.description !== undefined) payload.description = body.description
  if (body.location !== undefined) payload.location = body.location
  if (body.technology !== undefined) payload.technology = body.technology
  if (body.links !== undefined) payload.links = body.links
  if (body.documents !== undefined) payload.documents = body.documents && body.documents.length > 0 ? body.documents.map(doc => doc.docId).filter(Boolean) : null
  if (body.externalIDs !== undefined) payload.external_ids = body.externalIDs
  if (body.relatedProductionSourcesIds !== undefined) payload.related_production_sources = body.relatedProductionSourcesIds
  if (body.organizations !== undefined) payload.organizations = body.organizations
  if (body.metadata !== undefined) payload.metadata = body.metadata
  if (body.events !== undefined) payload.events = body.events

  const { data, error } = await supabase
    .from('production_sources')
    .update(payload)
    .eq('id', id)
    .select('id, name, description, technology, created_at')
    .single()

  if (error) throw error
  return data as any
}

export async function deleteProductionSource(id: string) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const { error } = await supabase
    .from('production_sources')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
