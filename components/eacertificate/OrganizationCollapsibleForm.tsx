"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createOrganizationFull } from '@/lib/services/organizations'
import { toast } from 'sonner'
import LocationField from '@/components/ui/location-field'
import LinksField from '@/components/ui/links-field'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import MetadataField from '@/components/ui/metadata-field'
import type { Location, ExternalID, MetadataItem } from '@/lib/types/eacertificate'

interface OrganizationCollapsibleFormProps {
  onOrganizationCreated: (organization: { id: string; name: string }) => void
  sharedDocuments: any[]
  defaultExpanded?: boolean
  hideHeader?: boolean
  plain?: boolean
}

interface OrganizationFormData {
  name: string
  url: string
  description: string
  contact: string
  location: Location
  links: string[]
  externalIDs: ExternalID[]
  metadata: MetadataItem[]
}

export default function OrganizationCollapsibleForm({ 
  onOrganizationCreated, 
  sharedDocuments,
  defaultExpanded = false,
  hideHeader = false,
  plain = false,
}: OrganizationCollapsibleFormProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    url: '',
    description: '',
    contact: '',
    location: { country: '', city: '', state: '', address: '', postalCode: '' },
    links: [],
    externalIDs: [],
    metadata: [],
  })

  const handleSubmit = async () => {
    setSaving(true)

    try {
      // First, create the organization without documents
      const org = await createOrganizationFull({
        name: formData.name,
        url: formData.url,
        description: formData.description,
        contact: formData.contact,
        location: formData.location,
        links: formData.links,
        documents: [], // Don't pass documents initially
        externalIDs: formData.externalIDs,
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
            organizations: [{ orgId: org.id, role: 'owner', orgName: org.name || 'Organization' }],
          })
          
          uploadedDocIds.push(uploadedDoc.id)
        }
        
        // Update the organization with the uploaded document IDs
        if (uploadedDocIds.length > 0) {
          const supabase = createClientComponentClient()
          await supabase
            .from('organizations')
            .update({ documents: uploadedDocIds })
            .eq('id', org.id)
        }
      }
      
      onOrganizationCreated({ id: org.id, name: org.name || 'Unnamed Organization' })
      toast.success('Organization created successfully')
      
      // Reset form
      setFormData({
        name: '',
        url: '',
        description: '',
        contact: '',
        location: { country: '', city: '', state: '', address: '', postalCode: '' },
        links: [],
        externalIDs: [],
        metadata: [],
      })
      setIsExpanded(false)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create organization')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={plain ? '' : "border border-gray-200 rounded-lg p-4"}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create Organization</h3>
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
            <label className="block text-sm font-medium text-gray-700">Name<span className="text-red-600"> *</span></label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} 
              placeholder="Acme Corp" 
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Website URL</label>
              <Input 
                value={formData.url} 
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))} 
                placeholder="https://example.com" 
                type="url" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact</label>
              <Input 
                value={formData.contact} 
                onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))} 
                placeholder="contact@example.com, +1 555 555 5555" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <Textarea 
              value={formData.description} 
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
              placeholder="Brief overview of the organization" 
              rows={3} 
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
            description="Add relevant links to this organization"
            placeholder="https://example.com"
          />

          <ExternalIdField
            value={formData.externalIDs}
            onChange={(v) => setFormData(prev => ({ ...prev, externalIDs: v }))}
            label="External identifiers"
            description="Link this organization to external systems. Only ID is required."
            addButtonText="Add external ID"
          />

          <MetadataField
            value={formData.metadata}
            onChange={(v) => setFormData(prev => ({ ...prev, metadata: v }))}
            label="Metadata"
            description="Add custom metadata fields for this organization"
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
              disabled={saving || !formData.name}
            >
              {saving ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}