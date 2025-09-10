'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProductionSource, updateProductionSource } from '@/lib/services/production-sources'
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import LocationField from '@/components/ui/location-field'
import LinksField from '@/components/ui/links-field'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import DocumentUploader from '@/components/documents/DocumentUploader'
import MetadataField from '@/components/ui/metadata-field'
import type { Location, ExternalID, MetadataItem, OrganizationRole } from '@/lib/types/eacertificate'

export default function NewProductionSourcePage() {
  const router = useRouter()
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
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-2xl font-semibold">Create Production Source</h1>
          </div>
        </div>
        <form
          className="space-y-6 bg-white border rounded p-6"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              // First, create the production source without documents
              const source = await createProductionSource({
                name: form.name,
                description: form.description,
                location: form.location,
                links: form.links,
                technology: form.technology,
                documents: [], // Don't pass documents initially
                externalIDs: form.externalIDs,
                relatedProductionSourcesIds: form.relatedProductionSources.map(eid => eid.id).filter(Boolean),
                metadata: form.metadata,
              })

              // Then, upload documents if any exist
              const docs = Array.isArray(form.documents) ? form.documents : []
              if (docs.length > 0) {
                const uploadedDocIds: string[] = []
                
                for (const item of docs) {
                  if (!item?.file) continue
                  
                  const uploadedDoc = await uploadAndCreateDocument({
                    file: item.file,
                    fileName: item.file.name,
                    fileType: item.fileType,
                    title: item.title,
                    description: item.description,
                    metadata: item.metadata,
                    organizations: [{ orgId: source.id, role: 'owner', orgName: source.name || 'Production Source' }],
                  })
                  
                  uploadedDocIds.push(uploadedDoc.id)
                }
                
                // Update the production source with the uploaded document IDs
                if (uploadedDocIds.length > 0) {
                  await updateProductionSource(source.id, {
                    documents: uploadedDocIds.map(id => ({ docId: id } as any)),
                  })
                }
              }
              
              toast.success('Production source created')
              router.push('/production-sources')
            } catch (e: any) {
              toast.error(e.message ?? 'Failed to create production source')
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
            <Button type="button" variant="outline" onClick={() => router.push('/production-sources')}>Cancel</Button>
            <Button disabled={saving}>{saving ? 'Creating...' : 'Create Production Source'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
