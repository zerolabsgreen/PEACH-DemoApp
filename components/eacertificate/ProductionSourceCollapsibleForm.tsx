"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createProductionSource, updateProductionSource } from '@/lib/services/production-sources'
import { toast } from 'sonner'
import LocationField from '@/components/ui/location-field'
import LinksField from '@/components/ui/links-field'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import MetadataField from '@/components/ui/metadata-field'
import { FileType } from '@/lib/types/eacertificate'
import type { Location, ExternalID, MetadataItem } from '@/lib/types/eacertificate'

interface ProductionSourceCollapsibleFormProps {
  onProductionSourceCreated: (productionSource: { id: string; name: string }) => void
  sharedDocuments: any[]
  defaultExpanded?: boolean
  hideHeader?: boolean
  plain?: boolean
}

interface ProductionSourceFormData {
  name: string
  description: string
  location: Location
  links: string[]
  technology: string
  externalIDs: ExternalID[]
  relatedProductionSources: ExternalID[]
  metadata: MetadataItem[]
}

export default function ProductionSourceCollapsibleForm({ 
  onProductionSourceCreated, 
  sharedDocuments,
  defaultExpanded = false,
  hideHeader = false,
  plain = false,
}: ProductionSourceCollapsibleFormProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState<ProductionSourceFormData>({
    name: '',
    description: '',
    location: { country: '', city: '', state: '', address: '', postalCode: '' },
    links: [],
    technology: '',
    externalIDs: [],
    relatedProductionSources: [],
    metadata: [],
  })

  const handleSubmit = async () => {
    setSaving(true)

    try {
      // First, create the production source without documents
      const source = await createProductionSource({
        name: formData.name,
        description: formData.description,
        location: formData.location,
        links: formData.links,
        technology: formData.technology,
        documents: [], // Don't pass documents initially
        externalIDs: formData.externalIDs,
        relatedProductionSourcesIds: formData.relatedProductionSources.map(eid => eid.id).filter(Boolean),
        metadata: formData.metadata,
      })

      // Then, upload shared documents if any exist
      if (sharedDocuments.length > 0) {
        const { uploadAndCreateDocument } = await import('@/lib/services/documents')
        const { createClientComponentClient } = await import('@/lib/supabase')
        
        const uploadedDocIds: string[] = []
        
        for (const doc of sharedDocuments) {
          const uploadedDoc = await uploadAndCreateDocument({
            file: doc.file,
            fileName: doc.file.name,
            fileType: doc.fileType,
            title: doc.title,
            description: doc.description,
            metadata: doc.metadata,
            organizations: [{ orgId: source.id, role: 'owner', orgName: source.name || 'Production Source' }],
          })
          
          uploadedDocIds.push(uploadedDoc.id)
        }
        
        // Update the production source with the uploaded document IDs
        if (uploadedDocIds.length > 0) {
          const supabase = createClientComponentClient()
          await supabase
            .from('production_sources')
            .update({ documents: uploadedDocIds })
            .eq('id', source.id)
        }
      }
      
      onProductionSourceCreated({ id: source.id, name: source.name || 'Unnamed Production Source' })
      toast.success('Production source created successfully')
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        location: { country: '', city: '', state: '', address: '', postalCode: '' },
        links: [],
        technology: '',
        externalIDs: [],
        relatedProductionSources: [],
        metadata: [],
      })
      setIsExpanded(false)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create production source')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={plain ? '' : "border border-gray-200 rounded-lg p-4"}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create Production Source</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} 
              placeholder="Solar Farm Alpha" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <Textarea 
              value={formData.description} 
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="Brief overview of the production source" 
              rows={3} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Technology<span className="text-red-600"> *</span></label>
            <Input 
              value={formData.technology} 
              onChange={e => setFormData(prev => ({ ...prev, technology: e.target.value }))} 
              placeholder="Solar, Biogas, etc." 
              required 
            />
          </div>

          <LocationField
            value={formData.location}
            onChange={(v) => setFormData(prev => ({ ...prev, location: v }))}
            required
          />

          <LinksField
            value={formData.links}
            onChange={(v) => setFormData(prev => ({ ...prev, links: v }))}
            label="Links"
            description="Add relevant links to this production source"
            placeholder="https://example.com"
          />

          <ExternalIdField
            value={formData.externalIDs}
            onChange={(v) => setFormData(prev => ({ ...prev, externalIDs: v }))}
            label="External identifiers"
            description="Link this production source to external systems. Only ID is required."
            addButtonText="Add external ID"
          />

          <ExternalIdField
            value={formData.relatedProductionSources}
            onChange={(v) => setFormData(prev => ({ ...prev, relatedProductionSources: v }))}
            label="Related production sources"
            description="Link this production source to other related sources. Only ID is required."
            addButtonText="Add related source"
          />

          <MetadataField
            value={formData.metadata}
            onChange={(v) => setFormData(prev => ({ ...prev, metadata: v }))}
            label="Metadata"
            description="Add custom metadata fields for this production source"
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(false)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !formData.technology}
            >
              {saving ? 'Creating...' : 'Create Production Source'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
