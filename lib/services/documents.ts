import { createClientComponentClient } from '@/lib/supabase'
import { FileType, MetadataItem, OrganizationRole } from '@/lib/types/eacertificate'

function sanitizeFileName(originalName: string): string {
  const parts = originalName.split('.')
  const ext = parts.length > 1 ? parts.pop() as string : ''
  const base = parts.join('.')
  // Allow only ASCII letters, numbers, dot, hyphen, underscore. Replace others with '-'
  const safeBase = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 200) || 'file'
  const safeExt = ext
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '')
    .slice(0, 16)
  return safeExt ? `${safeBase}.${safeExt}` : safeBase
}

function formatErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error'
  // Supabase errors often have message or error.message
  const anyErr = err as any
  const message = anyErr?.message || anyErr?.error?.message || anyErr?.error_description
  if (typeof message === 'string' && message.trim().length > 0) return message
  try {
    return JSON.stringify(anyErr)
  } catch (_) {
    return String(anyErr)
  }
}

export interface UpsertDocumentInput {
  file: File
  fileName?: string
  /** Defaults to Organization Document */
  fileType?: FileType
  title?: string
  description?: string
  metadata?: MetadataItem[]
  organizations?: OrganizationRole[]
}

export interface DocumentRecord {
  id: string
  url: string
  file_type: FileType
  title: string | null
  description: string | null
  metadata: MetadataItem[] | null
  organizations: OrganizationRole[] | null
  created_at: string
  updated_at: string
}

/**
 * Uploads a file to Supabase Storage and creates a record in public.documents.
 * Returns the created row.
 */
export async function uploadAndCreateDocument(input: UpsertDocumentInput): Promise<DocumentRecord> {
  const supabase = createClientComponentClient()
  const bucket = 'documents'
  const name = sanitizeFileName(input.fileName || input.file.name)
  const docId = crypto.randomUUID()
  const path = `${docId}/${name}`

  // Ensure bucket exists is out-of-band; assume it exists here.
  try {
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, input.file, {
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path)

    const { data, error } = await supabase
      .from('documents')
      .insert({
        url: publicUrl.publicUrl,
        file_type: input.fileType ?? FileType.ORGANIZATION_DOCUMENT,
        title: input.title ?? null,
        description: input.description ?? null,
        metadata: input.metadata ?? null,
        organizations: input.organizations ?? null,
      })
      .select('*')
      .single()

    if (error) throw error
    return data as DocumentRecord
  } catch (e) {
    // Best-effort cleanup if DB insert failed after upload
    try {
      await supabase.storage.from(bucket).remove([path])
    } catch (_) {
      // ignore cleanup failures
    }
    throw new Error(formatErrorMessage(e))
  }
}

export async function deleteDocument(rowId: string): Promise<void> {
  const supabase = createClientComponentClient()
  const { error } = await supabase.from('documents').delete().eq('id', rowId)
  if (error) throw error
}

export async function getDocumentsByIds(ids: string[]) {
  if (!ids || ids.length === 0) return []
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .in('id', ids)
  if (error) throw error
  return data as DocumentRecord[]
}


