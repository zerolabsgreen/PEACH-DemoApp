"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import { EACType, EAC_TYPE_NAMES, type CreateEACertificateData, type UpdateEACertificateData } from '@/lib/types/eacertificate'
import { createEACertificate, updateEACertificate, getEACertificate } from '@/lib/services/eacertificates'
import { listProductionSources } from '@/lib/services/production-sources'
import DocumentUploader, { type DocumentFormItem } from '@/components/documents/DocumentUploader'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import LinksField from '@/components/ui/links-field'
import AmountsField from './AmountsField'
import EmissionsField from './EmissionsField'
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
  
  const [formData, setFormData] = useState<EACertificateFormData>({
    type: EACType.REC,
    amounts: [], // Start with no amounts - user must add them
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
            externalIDs: certificate.external_ids || [],
            amounts: certificate.amounts || [],
            emissions: certificate.emissions || [],
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
        const certificate = await createEACertificate(serviceData)
        
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
        
        router.push('/eacertificates')
      } else if (mode === 'edit' && certificateId) {
        // For edit, convert documents to the expected format
        const serviceData = {
          ...formData,
          documents: formData.documents.map(item => ({
            docId: item.createdRowId || item.localId,
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white shadow rounded-lg p-6">
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BackButton href={backHref} />
            <h1 className="text-2xl font-semibold">
              {mode === 'create' ? 'Create EA Certificate' : 'Edit EA Certificate'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificate Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as EACType })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(EAC_TYPE_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Production Source Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Source (Optional)
              </label>
              <select
                value={formData.productionSourceId || ''}
                onChange={(e) => setFormData({ ...formData, productionSourceId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a production source</option>
                {productionSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name || `Source ${source.id.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>

            {/* External IDs */}
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

            {/* Amounts */}
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

            {/* Emissions */}
            <EmissionsField
              value={formData.emissions || []}
              onChange={(value) => setFormData({ ...formData, emissions: value })}
              label="Emissions Data"
              description="Carbon intensity and emissions factor data"
            />

            {/* Links */}
            <LinksField
              value={formData.links || []}
              onChange={(value: string[]) => setFormData({ ...formData, links: value })}
              label="Links"
              description="Related URLs and references"
            />

                        {/* Documents */}
            <DocumentUploader
              defaultItems={[]}
              onChange={(items: DocumentFormItem[]) => {
                // Store the DocumentFormItem directly to preserve file objects for upload
                setFormData({ ...formData, documents: items })
              }}
            />

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
        </div>
      </div>
    </div>
  )
}
