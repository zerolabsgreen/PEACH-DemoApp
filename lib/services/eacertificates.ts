import { createClientComponentClient } from '@/lib/supabase'
import type { 
  EACertificateDB, 
  EACertificateWithDocuments,
  CreateEACertificateData, 
  UpdateEACertificateData, 
  EACType 
} from '@/lib/types/eacertificate'

export function getSupabase() {
  return createClientComponentClient()
}

export async function createEACertificate(body: CreateEACertificateData) {
  const supabase = getSupabase()
  
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw userError ?? new Error('No user')

    const payload = {
      type: body.type,
      external_ids: body.externalIDs || null,
      amounts: body.amounts || [],
      emissions: body.emissions || null,
      links: body.links || null,
      documents: body.documents && body.documents.length > 0 ? body.documents.map(doc => doc.docId).filter(Boolean) : null,
      production_source_id: body.productionSourceId || null,
    }

    // Clean up amounts to remove any extra fields that might cause issues
    if (payload.amounts && Array.isArray(payload.amounts)) {
      payload.amounts = payload.amounts.map(amount => ({
        amount: amount.amount,
        unit: amount.unit,
        conversionFactor: amount.conversionFactor,
        conversionNotes: amount.conversionNotes
        // Remove isPrimary field as it might not be expected by the database
      }))
    }

    // Ensure amounts is properly formatted for JSONB
    if (payload.amounts && Array.isArray(payload.amounts)) {
      // Convert to plain objects to ensure proper JSONB serialization
      // The trigger expects objects with amount and unit fields
      payload.amounts = payload.amounts.map(amount => ({
        amount: Number(amount.amount),
        unit: String(amount.unit),
        ...(amount.conversionFactor && { conversionFactor: Number(amount.conversionFactor) }),
        ...(amount.conversionNotes && { conversionNotes: String(amount.conversionNotes) })
      }))
      
    }

    // Ensure the first amount has the structure the trigger expects
    if (payload.amounts && payload.amounts.length > 0) {
      const firstAmount = payload.amounts[0]
      if (firstAmount && typeof firstAmount.amount === 'number' && typeof firstAmount.unit === 'string' && firstAmount.unit.trim() !== '') {
        // Amount structure is valid
      } else {
        throw new Error('First amount must have a valid amount (number > 0) and unit (non-empty string)')
      }
    } else {
      throw new Error('At least one amount is required')
    }

        const { data, error } = await supabase
      .from('eacertificates')
      .insert(payload)
      .select('id, type, created_at, updated_at')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    return data as any
  } catch (error) {
    console.error('Service error:', error)
    throw error
  }
}

export async function listEACertificates() {
  const supabase = getSupabase()
  
  try {
    const { data, error } = await supabase
      .from('eacertificates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('List error:', error)
      throw error
    }
    
    return data as EACertificateDB[]
  } catch (error) {
    console.error('List function error:', error)
    throw error
  }
}

export async function getEACertificate(id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('eacertificates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as EACertificateDB
}

export async function updateEACertificate(id: string, body: UpdateEACertificateData) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const payload: any = {}
  if (body.type !== undefined) payload.type = body.type
  if (body.externalIDs !== undefined) payload.external_ids = body.externalIDs
  if (body.amounts !== undefined) payload.amounts = body.amounts
  if (body.emissions !== undefined) payload.emissions = body.emissions
  if (body.links !== undefined) payload.links = body.links
  if (body.documents !== undefined) payload.documents = body.documents && body.documents.length > 0 ? body.documents.map(doc => doc.docId).filter(Boolean) : null
  if (body.productionSourceId !== undefined) payload.production_source_id = body.productionSourceId

  const { data, error } = await supabase
    .from('eacertificates')
    .update(payload)
    .eq('id', id)
    .select('id, type, created_at, updated_at')
    .single()

  if (error) throw error
  return data as any
}

export async function deleteEACertificate(id: string) {
  const supabase = getSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw userError ?? new Error('No user')

  const { error } = await supabase
    .from('eacertificates')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
