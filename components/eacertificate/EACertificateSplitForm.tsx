"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import { EACType, EAC_TYPE_NAMES, type CreateEACertificateData, type UpdateEACertificateData, FileType, FILE_TYPE_NAMES, EventTarget, type CreateEventData } from '@/lib/types/eacertificate'
import { FileExtension } from '@/components/documents/FileViewer'
import { createEACertificate, updateEACertificate, getEACertificate } from '@/lib/services/eacertificates'
import { listProductionSources } from '@/lib/services/production-sources'
import { createEvent } from '@/lib/services/events'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import LinksField from '@/components/ui/links-field'
import AmountsField from './AmountsField'
import EmissionsField from './EmissionsField'
import OrganizationCollapsibleForm from './OrganizationCollapsibleForm'
import ProductionSourceCollapsibleForm from './ProductionSourceCollapsibleForm'
import Dropzone from '@/components/documents/Dropzone'
import FileViewer from '@/components/documents/FileViewer'
import DocumentCard from '@/components/documents/DocumentCard'
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { createClientComponentClient } from '@/lib/supabase'
import DatePicker from '@/components/ui/date-picker'
import LocationField from '@/components/ui/location-field'
import { parseDateInput } from '@/lib/date-utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

export interface EACertificateSplitFormProps {
  mode: 'create' | 'edit'
  certificateId?: string
  backHref: string
}

interface UploadedDocument {
  id: string
  file: File
  fileType: FileType
  fileExtension: FileExtension
  title: string
  description: string
  metadata: Array<{ key: string; label: string; value: string }>
  organizations: Array<{ orgId: string; role: string }>
}

// Form data interface
interface EACertificateFormData extends Omit<CreateEACertificateData, 'documents'> {
  documents: UploadedDocument[]
}

export default function EACertificateSplitForm({ mode, certificateId, backHref }: EACertificateSplitFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [productionSources, setProductionSources] = useState<Array<{ id: string; name: string | null }>>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [createdOrganization, setCreatedOrganization] = useState<{ id: string; name: string } | null>(null)
  const [createdProductionSource, setCreatedProductionSource] = useState<{ id: string; name: string } | null>(null)
  const [events, setEvents] = useState<Array<{
    type: string
    description?: string
    dates: { start?: string; end?: string }
    location?: any
    organizations?: any[]
    notes?: string
    links?: string[]
  }>>([
    {
      type: '',
      description: '',
      dates: {},
      location: {} as any,
      organizations: [],
      notes: '',
      links: [],
    }
  ])
  
  const [formData, setFormData] = useState<EACertificateFormData>({
    type: EACType.REC,
    amounts: [],
    links: [],
    documents: [],
    productionSourceId: undefined,
  })

  const selectedDocument = React.useMemo(() => {
    return selectedDocumentId 
      ? formData.documents.find(doc => doc.id === selectedDocumentId)
      : formData.documents[0] || null
  }, [selectedDocumentId, formData.documents])

  // Event management functions
  const addEvent = () => {
    setEvents(prev => [...prev, {
      type: '',
      description: '',
      dates: {},
      location: {} as any,
      organizations: [],
      notes: '',
      links: [],
    }])
  }

  const removeEvent = (index: number) => {
    setEvents(prev => prev.filter((_, i) => i !== index))
  }

  const updateEvent = (index: number, field: string, value: any) => {
    setEvents(prev => prev.map((event, i) => 
      i === index ? { ...event, [field]: value } : event
    ))
  }

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

  // Auto-select first document when documents are added
  useEffect(() => {
    if (formData.documents.length > 0 && !selectedDocumentId) {
      setSelectedDocumentId(formData.documents[0].id)
    }
  }, [formData.documents, selectedDocumentId])

  const handleFilesUploaded = (files: File[]) => {
    const newDocuments: UploadedDocument[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      fileType: FileType.CERTIFICATE, // Default to Certificate type
      fileExtension: file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'PDF',
      title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      description: '',
      metadata: [],
      organizations: [],
    }))

    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...newDocuments]
    }))
  }

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId)
  }

  const handleDocumentRemove = (documentId: string) => {
    setFormData(prev => {
      const updatedDocuments = prev.documents.filter(doc => doc.id !== documentId)
      let newSelectedDocumentId: string | null = selectedDocumentId

      if (selectedDocumentId === documentId) {
        // If the removed document was the selected one
        if (updatedDocuments.length > 0) {
          // Select the first remaining document
          newSelectedDocumentId = updatedDocuments[0].id
        } else {
          // No documents left
          newSelectedDocumentId = null
        }
      }
      
      return {
        ...prev,
        documents: updatedDocuments,
      }
    })

    // Update selectedDocumentId after state update
    if (selectedDocumentId === documentId) {
      const remainingDocs = formData.documents.filter(doc => doc.id !== documentId)
      setSelectedDocumentId(remainingDocs.length > 0 ? remainingDocs[0].id : null)
    }
  }

  const handleDocumentUpdate = (documentId: string, updates: Partial<UploadedDocument>) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map(doc => 
        doc.id === documentId ? { ...doc, ...updates } : doc
      )
    }))
  }

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
        // Use created production source ID if available, otherwise use the selected one
        const finalProductionSourceId = createdProductionSource?.id || formData.productionSourceId
        
        // Convert form data to service format (without documents for now)
        const serviceData = {
          ...formData,
          productionSourceId: finalProductionSourceId,
          documents: [] // Start with empty documents, will update after upload
        }
        
        // Create certificate first
        const certificate = await createEACertificate(serviceData)
        
        // Upload documents if any exist and collect their IDs
        let uploadedDocIds: string[] = []
        if (formData.documents.length > 0) {
          const supabase = createClientComponentClient()
          
          await Promise.all(
            formData.documents.map(async (doc) => {
              const uploadedDoc = await uploadAndCreateDocument({
                file: doc.file,
                fileName: doc.file.name,
                fileType: doc.fileType,
                title: doc.title,
                description: doc.description,
                metadata: doc.metadata,
                organizations: doc.organizations,
              })
              uploadedDocIds.push(uploadedDoc.id)
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
        
        // Create events if any exist, with shared documents
        const validEvents = events.filter(event => event.type.trim() !== '')
        if (validEvents.length > 0) {
          const createEventPromises = validEvents.map(event => {
            const payload: CreateEventData = {
              target: EventTarget.EAC,
              targetId: certificate.id,
              type: event.type,
              description: event.description,
              dates: {
                start: parseDateInput(event.dates.start as string) || new Date(),
                ...(event.dates.end ? { end: parseDateInput(event.dates.end) || new Date() } : {}),
              },
              location: event.location,
              organizations: event.organizations,
              notes: event.notes,
              links: event.links,
              // Include shared documents if any exist
              documents: uploadedDocIds.length > 0 ? uploadedDocIds.map((id, index) => ({
                id,
                url: '', // Will be populated by the service
                fileType: formData.documents[index]?.fileType || 'PDF',
                title: formData.documents[index]?.title || '',
                description: formData.documents[index]?.description || '',
                metadata: formData.documents[index]?.metadata || [],
                organizations: formData.documents[index]?.organizations || [],
              })) : undefined,
            }
            return createEvent(payload)
          })

          await Promise.all(createEventPromises)
        }
        
        // Show success message and redirect
        if (validEvents.length > 0) {
          toast.success(`Certificate created successfully! ${validEvents.length} event(s) also created.`)
        } else {
          toast.success('Certificate created successfully!')
        }
        router.push('/eacertificates')
      } else if (mode === 'edit' && certificateId) {
        // For edit, convert documents to the expected format
        const serviceData = {
          ...formData,
          documents: formData.documents.map(doc => ({
            id: doc.id,
            url: '', // Will be generated during upload
            fileType: doc.fileType,
            title: doc.title,
            description: doc.description,
            metadata: doc.metadata,
            organizations: doc.organizations,
          }))
        }
        await updateEACertificate(certificateId, serviceData)
        router.push(`/eacertificates/${certificateId}`)
      }
    } catch (error) {
      console.error('Failed to save certificate:', error)
      
      // Show user-friendly error message
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`)
      } else {
        toast.error('An unexpected error occurred while saving the certificate')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg">
          <div className="flex items-center gap-2 p-6 border-b">
            <BackButton />
            <h1 className="text-2xl font-semibold">
              {mode === 'create' ? 'Create EA Certificate' : 'Edit EA Certificate'}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[calc(100vh-200px)]">
            {/* Left Side - File Upload & Viewer */}
            <div className="border-r border-gray-200 p-6">
              {formData.documents.length === 0 ? (
                // Show only dropzone when no files are uploaded
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
                  <Dropzone
                    onFilesAccepted={handleFilesUploaded}
                    maxFiles={10}
                    className="h-64"
                  />
                </div>
              ) : (
                // Show only file viewer when files are uploaded
                <div className="sticky top-2.5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
                  <FileViewer
                    file={selectedDocument?.file}
                    fileType={selectedDocument?.fileType}
                    fileExtension={selectedDocument?.fileExtension}
                    title={selectedDocument?.title}
                    className="h-[calc(100vh-200px)]"
                  />
                </div>
              )}
            </div>

            {/* Right Side - Form */}
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Collapsible Forms for Organization and Production Source */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Create Related Entities</h2>
                  <p className="text-sm text-gray-600">
                    Create an organization and production source that will be associated with this certificate. 
                    Documents uploaded on the left will be shared with these entities.
                  </p>
                  
                  {/* Status of created entities */}
                  {(createdOrganization || createdProductionSource) && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Created Entities:</h4>
                      <div className="space-y-1 text-sm text-green-700">
                        {createdOrganization && (
                          <p>✓ Organization: {createdOrganization.name}</p>
                        )}
                        {createdProductionSource && (
                          <p>✓ Production Source: {createdProductionSource.name}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <OrganizationCollapsibleForm
                    onOrganizationCreated={setCreatedOrganization}
                    sharedDocuments={formData.documents}
                  />
                  
                  <ProductionSourceCollapsibleForm
                    onProductionSourceCreated={setCreatedProductionSource}
                    sharedDocuments={formData.documents}
                  />
                </div>

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
                    value={createdProductionSource?.id || formData.productionSourceId || ''}
                    onChange={(e) => setFormData({ ...formData, productionSourceId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a production source</option>
                    {createdProductionSource && (
                      <option key={createdProductionSource.id} value={createdProductionSource.id}>
                        {createdProductionSource.name} (Newly Created)
                      </option>
                    )}
                    {productionSources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name || `Source ${source.id.slice(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                  {createdProductionSource && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Using newly created production source: {createdProductionSource.name}
                    </p>
                  )}
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

                {/* Events Section - only show in create mode */}
                {mode === 'create' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Events</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          addEvent()
                        }}
                      >
                        + Add Event
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Add events that will be associated with this certificate. 
                      Events will be created after the certificate is successfully created.
                    </p>

                    <div className="space-y-4">
                      {events.map((event, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-medium text-gray-700">Event {index + 1}</h4>
                            {events.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeEvent(index)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Type<span className="text-red-600"> *</span></label>
                              <Input 
                                value={event.type} 
                                onChange={(e) => {
                                  e.stopPropagation()
                                  updateEvent(index, 'type', e.target.value)
                                }} 
                                placeholder="e.g., Commissioning, Maintenance, Inspection"
                                required 
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Description</label>
                              <Textarea 
                                value={event.description || ''} 
                                onChange={(e) => {
                                  e.stopPropagation()
                                  updateEvent(index, 'description', e.target.value)
                                }} 
                                placeholder="Describe the event"
                                rows={3} 
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <DatePicker
                                label="Start date"
                                value={event.dates.start ? parseDateInput(event.dates.start) || undefined : undefined}
                                onChange={(date) => updateEvent(index, 'dates', { 
                                  ...event.dates, 
                                  start: date ? format(date, 'yyyy-MM-dd') : undefined 
                                })}
                                required
                              />
                              <DatePicker
                                label="End date"
                                value={event.dates.end ? parseDateInput(event.dates.end) || undefined : undefined}
                                onChange={(date) => updateEvent(index, 'dates', { 
                                  ...event.dates, 
                                  end: date ? format(date, 'yyyy-MM-dd') : undefined 
                                })}
                              />
                            </div>

                            <LocationField 
                              value={event.location as any} 
                              onChange={(v) => updateEvent(index, 'location', v)} 
                            />

                            <div>
                              <label className="block text-sm font-medium text-gray-700">Notes</label>
                              <Textarea 
                                value={event.notes || ''} 
                                onChange={(e) => {
                                  e.stopPropagation()
                                  updateEvent(index, 'notes', e.target.value)
                                }} 
                                rows={3} 
                              />
                            </div>

                            <LinksField 
                              value={event.links ?? []} 
                              onChange={(v) => updateEvent(index, 'links', v)} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Management */}
                {formData.documents.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">Uploaded Documents</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Create a hidden file input to trigger file selection
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = '.pdf,.csv'
                            input.multiple = true
                            input.onchange = (e) => {
                              const files = Array.from((e.target as HTMLInputElement).files || [])
                              if (files.length > 0) {
                                handleFilesUploaded(files)
                              }
                            }
                            input.click()
                          }}
                          className="text-xs"
                        >
                          + Add More Files
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {formData.documents.map((doc) => (
                          <DocumentCard
                            key={doc.id}
                            file={doc.file}
                            fileType={doc.fileType}
                            fileExtension={doc.fileExtension}
                            title={doc.title}
                            description={doc.description}
                            isSelected={selectedDocumentId === doc.id}
                            onSelect={() => handleDocumentSelect(doc.id)}
                            onRemove={() => handleDocumentRemove(doc.id)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Document Details Form */}
                    {selectedDocument && (
                      <div className="border-t pt-4 space-y-4">
                        <h4 className="text-sm font-medium text-gray-700">Document Details</h4>
                        
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Title</label>
                          <Input
                            value={selectedDocument.title}
                            onChange={(e) => handleDocumentUpdate(selectedDocument.id, { title: e.target.value })}
                            placeholder="Document title"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <Textarea
                            value={selectedDocument.description}
                            onChange={(e) => handleDocumentUpdate(selectedDocument.id, { description: e.target.value })}
                            rows={3}
                            placeholder="Document description"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1">File Type</label>
                          <select
                            value={selectedDocument.fileType}
                            onChange={(e) => handleDocumentUpdate(selectedDocument.id, { fileType: e.target.value as FileType })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {Object.entries(FILE_TYPE_NAMES).map(([key, name]) => (
                              <option key={key} value={key}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
