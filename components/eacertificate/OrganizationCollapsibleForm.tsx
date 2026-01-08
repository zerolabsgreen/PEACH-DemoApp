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
import OptionalFormSection, { useOptionalFields } from '@/components/ui/optional-form-section'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'
import { OrgRoleTypes, type Location, type ExternalID, type MetadataItem } from '@/lib/types/eacertificate'
import { type OptionalField } from '@/components/ui/optional-fields-manager'

// Define optional fields configuration
const OPTIONAL_FIELDS: OptionalField[] = [
  {
    key: 'url',
    label: 'Website URL',
    description: 'Organization website URL',
  },
  {
    key: 'contact',
    label: 'Contact',
    description: 'Contact information',
  },
  {
    key: 'description',
    label: 'Description',
    description: 'Organization description',
  },
  {
    key: 'location',
    label: 'Location',
    description: 'Organization location information',
  },
  {
    key: 'links',
    label: 'Links',
    description: 'Related links and references',
  },
  {
    key: 'externalIDs',
    label: 'External IDs',
    description: 'External system identifiers',
  },
  {
    key: 'metadata',
    label: 'Metadata',
    description: 'Custom metadata fields',
  },
]

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
  const { visibleOptionalFields, setVisibleOptionalFields } = useOptionalFields()
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    url: '',
    description: '',
    contact: '',
    location: { country: '', subdivision: '', region: '', address: '', zipCode: '' },
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
            organizations: [{ orgId: org.id, role: OrgRoleTypes.OTHER, orgName: org.name || 'Organization', roleCustom: 'Owner' }],
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
        location: { country: '', subdivision: '', region: '', address: '', zipCode: '' },
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
          {/* Required fields */}
          <div>
            <FormFieldWrapper label="Name" required>
              <Input 
                value={formData.name} 
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                placeholder="Acme Corp" 
                required 
              />
            </FormFieldWrapper>
          </div>

          {/* Optional fields section */}
          <OptionalFormSection
            title="Additional Information"
            description="Optional details about this organization"
            optionalFields={OPTIONAL_FIELDS}
            visibleOptionalFields={visibleOptionalFields}
            onOptionalFieldsChange={setVisibleOptionalFields}
            showAddButton={false}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFieldWrapper 
                  label="Website URL" 
                  visible={visibleOptionalFields.includes('url')}
                >
                  <Input 
                    value={formData.url} 
                    onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))} 
                    placeholder="https://example.com" 
                    type="url" 
                  />
                </FormFieldWrapper>
                <FormFieldWrapper 
                  label="Contact" 
                  visible={visibleOptionalFields.includes('contact')}
                >
                  <Input 
                    value={formData.contact} 
                    onChange={e => setFormData(prev => ({ ...prev, contact: e.target.value }))} 
                    placeholder="contact@example.com, +1 555 555 5555" 
                  />
                </FormFieldWrapper>
              </div>

              <FormFieldWrapper 
                label="Description" 
                visible={visibleOptionalFields.includes('description')}
              >
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                  placeholder="Brief overview of the organization" 
                  rows={3} 
                />
              </FormFieldWrapper>

              <FormFieldWrapper 
                label="Location" 
                visible={visibleOptionalFields.includes('location')}
              >
                <LocationField
                  value={formData.location}
                  onChange={(v) => setFormData(prev => ({ ...prev, location: v }))}
                />
              </FormFieldWrapper>

              <FormFieldWrapper 
                label="Links" 
                visible={visibleOptionalFields.includes('links')}
              >
                <LinksField
                  value={formData.links}
                  onChange={(v) => setFormData(prev => ({ ...prev, links: v }))}
                  label="Links"
                  description="Add relevant links to this organization"
                  placeholder="https://example.com"
                />
              </FormFieldWrapper>

              <FormFieldWrapper 
                label="External IDs" 
                visible={visibleOptionalFields.includes('externalIDs')}
              >
                <ExternalIdField
                  value={formData.externalIDs}
                  onChange={(v) => setFormData(prev => ({ ...prev, externalIDs: v }))}
                  label="External identifiers"
                  description="Link this organization to external systems. Only ID is required."
                  addButtonText="Add external ID"
                />
              </FormFieldWrapper>

              <FormFieldWrapper 
                label="Metadata" 
                visible={visibleOptionalFields.includes('metadata')}
              >
                <MetadataField
                  value={formData.metadata}
                  onChange={(v) => setFormData(prev => ({ ...prev, metadata: v }))}
                  label="Metadata"
                  description="Add custom metadata fields for this organization"
                />
              </FormFieldWrapper>
            </div>
          </OptionalFormSection>

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