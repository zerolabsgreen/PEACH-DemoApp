import { createClientComponentClient } from '@/lib/supabase'
import { FileType, MetadataItem, OrganizationRole } from '@/lib/types/eacertificate'

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
  doc_id: string
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
  const fileExt = input.file.name.split('.').pop() || 'bin'
  const name = input.fileName || input.file.name
  const docId = crypto.randomUUID()
  const path = `${docId}/${name}`

  // Ensure bucket exists is out-of-band; assume it exists here.
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, input.file, {
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path)

  const { data, error } = await supabase
    .from('documents')
    .insert({
      doc_id: docId,
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
}

export async function deleteDocument(rowId: string): Promise<void> {
  const supabase = createClientComponentClient()
  const { error } = await supabase.from('documents').delete().eq('id', rowId)
  if (error) throw error
}


