"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { EACType, EAC_TYPE_NAMES, type CreateEACertificateData, type UpdateEACertificateData } from '@/lib/types/eacertificate'
import { createEACertificate, updateEACertificate, getEACertificate } from '@/lib/services/eacertificates'
import { listProductionSources } from '@/lib/services/production-sources'
import { formatProductionSourceLabel } from '@/lib/utils/production-source-utils'
import DocumentUploader, { type DocumentFormItem } from '@/components/documents/DocumentUploader'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import LinksField from '@/components/ui/links-field'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AmountsField from './AmountsField'
import EmissionsField from './EmissionsField'
import OrganizationRoleField from './OrganizationRoleField'
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { createClientComponentClient } from '@/lib/supabase'

export interface EACertificateFormProps {
  mode: 'create' | 'edit'
  certificateId?: string
  backHref: string
}

// Form data interface that overrides documents to use DocumentFormItem
interface EACertificateFormData extends Omit<CreateEACertificateData, 'documents'> {
  documents: DocumentFormItem[]
}

export default function EACertificateForm({ mode, certificateId, backHref }: EACertificateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [productionSources, setProductionSources] = useState<Array<{ id: string; name: string | null }>>([])
  const [isMultiCreate, setIsMultiCreate] = useState(false)
  // Removed created entity state as inline creation UI was removed
  
  const [formData, setFormData] = useState<EACertificateFormData>({
    type: EACType.REC,
    type2: '', // Additional certificate type information
    amounts: [], // Start with no amounts - user must add them
    organizations: [], // Start with no organizations
    links: [],
    documents: [],
    productionSourceId: undefined,
  })

  useEffect(() => {
    const loadProductionSources = async () => {
      try {
        const sources = await listProductionSources()
        setProductionSources(sources)
      } catch (error) {
        console.error('Failed to load production sources:', error)
      }
    }

    const loadCertificate = async () => {
      if (mode === 'edit' && certificateId) {
        try {
          setLoading(true)
          const certificate = await getEACertificate(certificateId)
          setFormData({
            type: certificate.type,
            type2: certificate.type2 || '',
            externalIDs: certificate.external_ids || [],
            amounts: certificate.amounts || [],
            emissions: certificate.emissions || [],
            organizations: certificate.organizations || [],
            links: certificate.links || [],
            documents: [], // We'll need to fetch documents separately
            productionSourceId: certificate.production_source_id || undefined,
          })
          
        } catch (error) {
          console.error('Failed to load certificate:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadProductionSources()
    loadCertificate()
  }, [mode, certificateId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Basic validation
      if (!formData.externalIDs || formData.externalIDs.length === 0) {
        throw new Error('At least one external ID is required. Please add an external ID before submitting.')
      }

      if (!formData.amounts || formData.amounts.length === 0) {
        throw new Error('At least one amount is required. Please add an amount before submitting.')
      }

      // Validate external IDs
      for (let i = 0; i < formData.externalIDs.length; i++) {
        const externalId = formData.externalIDs[i]
        if (!externalId || !externalId.id || externalId.id.trim() === '') {
          throw new Error(`External ID ${i + 1} must have a valid ID field`)
        }
      }

      // Validate all amounts
      for (let i = 0; i < formData.amounts.length; i++) {
        const amount = formData.amounts[i]
        if (!amount || typeof amount.amount !== 'number' || amount.amount <= 0) {
          throw new Error(`Amount ${i + 1} must be a number greater than 0`)
        }
        if (!amount.unit || amount.unit.trim() === '') {
          throw new Error(`Unit is required for amount ${i + 1}`)
        }
      }

      if (mode === 'create') {
        // Convert form data to service format (without documents for now)
        const serviceData = {
          ...formData,
          documents: [] // Start with empty documents, will update after upload
        }
        
        // Create certificate first
        const certificate = await createEACertificate({
          ...serviceData,
          productionSourceId: formData.productionSourceId
        })
        
        // Then upload documents if any exist
        const docs = Array.isArray(formData.documents) ? formData.documents : []
        if (docs.length > 0) {
          const supabase = createClientComponentClient()
          const uploadedDocIds: string[] = []
          
          await Promise.all(
            docs.map(async (item: any) => {
              if (!item?.file) return
              const doc = await uploadAndCreateDocument({
                file: item.file,
                fileName: item.file.name,
                fileType: item.fileType,
                title: item.title,
                description: item.description,
                metadata: item.metadata,
                organizations: item.organizations || [],
              })
              uploadedDocIds.push(doc.id)
            })
          )
          
          // Update certificate with document IDs
          if (uploadedDocIds.length > 0) {
            await supabase
              .from('eacertificates')
              .update({ documents: uploadedDocIds })
              .eq('id', certificate.id)
          }
        }
        
        // Show success message and redirect to events creation page
        alert('Certificate created successfully! You can now create events for this certificate.')
        router.push(`/eacertificates/${certificate.id}/events`)
      } else if (mode === 'edit' && certificateId) {
        // For edit, convert documents to the expected format
        const serviceData = {
          ...formData,
          documents: formData.documents.map(item => ({
            id: item.createdRowId || item.localId,
            url: item.url || '',
            fileType: item.fileType,
            title: item.title,
            description: item.description,
            metadata: item.metadata,
            organizations: item.organizations,
          }))
        }
        await updateEACertificate(certificateId, serviceData)
        router.push(`/eacertificates/${certificateId}`)
      }
    } catch (error) {
      console.error('Failed to save certificate:', error)
      
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`Error: ${error.message}`)
      } else {
        alert('An unexpected error occurred while saving the certificate')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <BackButton />
          <h1 className="text-2xl font-semibold">
            {mode === 'create' ? 'Create EACertificate' : 'Edit EACertificate'}
          </h1>
        </div>

        {/* Multi-create switch (create mode only) */}
        {mode === 'create' && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm font-medium">Do you want to create multiple certificates?</div>
              <div className="text-xs text-muted-foreground">Toggle to switch between single and multiple creation modes.</div>
            </div>
            <Switch checked={isMultiCreate} onCheckedChange={setIsMultiCreate} />
          </div>
        )}

        {isMultiCreate ? (
          <div className="text-sm text-gray-500 text-center py-10 border-2 border-dashed border-gray-300 rounded-md">
            Multiple certificates form
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* 1. Certificate Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificate Type *
              </label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as EACType })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select certificate type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EAC_TYPE_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Subtype */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtype
              </label>
              <input
                type="text"
                value={formData.type2 || ''}
                onChange={(e) => setFormData({ ...formData, type2: e.target.value })}
                placeholder="e.g. REC, I-REC, GO, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 3. Amounts */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <span className="text-red-600">*</span> At least one amount is required to create a certificate.
              </div>
              <AmountsField
                value={formData.amounts || []}
                onChange={(value) => setFormData({ ...formData, amounts: value })}
                label="Amounts"
                description="Energy or carbon amounts associated with this certificate"
              />
            </div>

            {/* 4. Emissions Data */}
            <EmissionsField
              value={formData.emissions || []}
              onChange={(value) => setFormData({ ...formData, emissions: value })}
              label="Emissions Data"
              description="Carbon intensity and emissions factor data"
            />

            {/* 5. Production Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Source (Optional)
              </label>
              <Select
                value={formData.productionSourceId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, productionSourceId: value === 'none' ? undefined : value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a production source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {productionSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {formatProductionSourceLabel(source)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. Organizations */}
            <OrganizationRoleField
              value={formData.organizations || []}
              onChange={(value) => setFormData({ ...formData, organizations: value })}
              label="Organizations"
              description="Assign roles to organizations for this certificate"
              sharedDocuments={formData.documents}
            />

            {/* 7. Events Section - only show in create mode */}
            {mode === 'create' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Events</h3>
                <p className="text-sm text-gray-600">
                  Events will be created after the certificate is successfully created. 
                  You can add multiple events that will be associated with this certificate.
                </p>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-500">
                    Events will be available for creation after the certificate is saved.
                  </p>
                </div>
              </div>
            )}

            {/* 8. External IDs */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <span className="text-red-600">*</span> At least one external ID is required to create a certificate.
              </div>
              <ExternalIdField
                value={formData.externalIDs || []}
                onChange={(value: any[]) => setFormData({ ...formData, externalIDs: value })}
                label={<span>External IDs <span className="text-red-600">*</span></span>}
                description="External identifiers for this certificate"
              />
            </div>

            {/* 9. Links */}
            <LinksField
              value={formData.links || []}
              onChange={(value: string[]) => setFormData({ ...formData, links: value })}
              label="Links"
              description="Related URLs and references"
            />

            {/* Documents - only show in create mode */}
            {mode === 'create' && (
              <DocumentUploader
                defaultItems={[]}
                onChange={(items: DocumentFormItem[]) => {
                  // Store the DocumentFormItem directly to preserve file objects for upload
                  setFormData({ ...formData, documents: items })
                }}
              />
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(backHref)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formData.amounts || formData.amounts.length === 0 || !formData.externalIDs || formData.externalIDs.length === 0}
              >
                {submitting ? 'Saving...' : mode === 'create' ? 'Create Certificate' : 'Update Certificate'}
              </Button>
            </div>
        </form>
        )}
      </div>
    </div>
  )
}
