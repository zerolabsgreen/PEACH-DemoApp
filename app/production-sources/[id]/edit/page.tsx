'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProductionSource, updateProductionSource } from '@/lib/services/production-sources'
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import LocationField from '@/components/ui/location-field'
import LinksField from '@/components/ui/links-field'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import DocumentUploader from '@/components/documents/DocumentUploader'
import MetadataField from '@/components/ui/metadata-field'
import type { Location, ExternalID, MetadataItem, OrganizationRole, ProductionSourceDB } from '@/lib/types/eacertificate'

export default function EditProductionSourcePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [source, setSource] = useState<ProductionSourceDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: { country: '', city: '', state: '', address: '', postalCode: '' } as Location,
    links: [] as string[],
    technology: '',
    documents: [] as any[],
    externalIDs: [] as ExternalID[],
    relatedProductionSources: [] as ExternalID[],
    metadata: [] as MetadataItem[],
  })
  const [existingDocumentIds, setExistingDocumentIds] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProductionSource(id)
        setSource(data)
        setForm({
          name: data.name || '',
          description: data.description || '',
          location: data.location || { country: '', city: '', state: '', address: '', postalCode: '' },
          links: data.links || [],
          technology: data.technology || '',
          documents: [],
          externalIDs: data.external_ids || [],
          relatedProductionSources: data.related_production_sources ? 
            data.related_production_sources.map(id => ({ id, ownerOrgId: '', ownerOrgName: '', description: '', externalFieldName: '' })) : [],
          metadata: data.metadata || [],
        })
        setExistingDocumentIds(data.documents || [])
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to load production source')
        router.push('/production-sources')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-center gap-2 mb-6">
            <BackButton href={`/production-sources/${params.id}`} />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="bg-white border rounded p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!source) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton href={`/production-sources/${params.id}`} />
            <h1 className="text-2xl font-semibold">Edit Production Source</h1>
          </div>
        </div>
        <form
          className="space-y-6 bg-white border rounded p-6"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              // Handle document uploads first if there are new documents
              const docs = Array.isArray(form.documents) ? form.documents : []
              let finalDocumentIds = [...existingDocumentIds]
              
              if (docs.length > 0) {
                const newDocIds: string[] = []
                
                for (const item of docs) {
                  if (!item?.file) continue
                  
                  const uploadedDoc = await uploadAndCreateDocument({
                    file: item.file,
                    fileName: item.file.name,
                    fileType: item.fileType,
                    title: item.title,
                    description: item.description,
                    metadata: item.metadata,
                    organizations: [{ orgId: id, role: 'owner', orgName: form.name || 'Production Source' }],
                  })
                  
                  newDocIds.push(uploadedDoc.id)
                }
                
                finalDocumentIds = [...existingDocumentIds, ...newDocIds]
              }
              
              // Update the production source
              await updateProductionSource(id, {
                name: form.name,
                description: form.description,
                location: form.location,
                links: form.links,
                technology: form.technology,
                documents: finalDocumentIds.map(docId => ({ docId } as any)),
                externalIDs: form.externalIDs,
                relatedProductionSourcesIds: form.relatedProductionSources.map(eid => eid.id).filter(Boolean),
                metadata: form.metadata,
              })
              
              toast.success('Production source updated')
              router.push(`/production-sources/${id}`)
            } catch (e: any) {
              toast.error(e.message ?? 'Failed to update production source')
            } finally {
              setSaving(false)
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Solar Farm Alpha" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief overview of the production source" rows={4} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Technology<span className="text-red-600"> *</span></label>
            <Input value={form.technology} onChange={e => set('technology', e.target.value)} placeholder="Solar, Biogas, etc." required />
          </div>

          <LocationField
            value={form.location}
            onChange={(v) => set('location', v)}
            required
          />

          <LinksField
            value={form.links}
            onChange={(v) => set('links', v)}
            label="Links"
            description="Add relevant links to this production source"
            placeholder="https://example.com"
          />

          <div>
            <ExternalIdField
              value={form.externalIDs}
              onChange={(v) => set('externalIDs', v)}
              label="External identifiers"
              description="Link this production source to external systems. Only ID is required."
              addButtonText="Add external ID"
            />
          </div>

          <div className="mt-8">
            <ExternalIdField
              value={form.relatedProductionSources}
              onChange={(v) => set('relatedProductionSources', v)}
              label="Related production sources"
              description="Link this production source to other related sources. Only ID is required."
              addButtonText="Add related source"
            />
          </div>

          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700">Documents</label>
            <div className="mt-2">
              <DocumentUploader
                defaultOrganizations={[] as OrganizationRole[]}
                onChange={(items) => set('documents', items)}
              />
            </div>
          </div>

          <div className="mt-8">
            <MetadataField
              value={form.metadata}
              onChange={(v) => set('metadata', v)}
              label="Metadata"
              description="Add custom metadata fields for this production source"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(`/production-sources/${id}`)}>Cancel</Button>
            <Button disabled={saving}>{saving ? 'Updating...' : 'Update Production Source'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
