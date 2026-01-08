"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EACType, EAC_TYPE_NAMES, type CreateEACertificateData, type UpdateEACertificateData, FileType, FILE_TYPE_NAMES, EventTarget, type CreateEventData, type MetadataItem, type OrganizationRole } from '@/lib/types/eacertificate'
import { FileExtension } from '@/components/documents/FileViewer'
import { createEACertificate, updateEACertificate, getEACertificate } from '@/lib/services/eacertificates'
import { listProductionSources, getProductionSource } from '@/lib/services/production-sources'
import { createEvent } from '@/lib/services/events'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import LinksField from '@/components/ui/links-field'
import MetadataField from '@/components/ui/metadata-field'
import AmountsField from './AmountsField'
import EmissionsField from './EmissionsField'
import OrganizationRoleField from './OrganizationRoleField'
// Removed in-view creation of related entities (organization/production source)
import ProductionSourceCollapsibleForm from './ProductionSourceCollapsibleForm'
import Dropzone from '@/components/documents/Dropzone'
import FileViewer from '@/components/documents/FileViewer'
import DocumentCard from '@/components/documents/DocumentCard'
import AttachedDocumentsPanel from '@/components/documents/AttachedDocumentsPanel'
import {DocumentEditSheet} from "@/components/documents/DocumentEditSheet"
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { createClientComponentClient } from '@/lib/supabase'
import DatePicker from '@/components/ui/date-picker'
import LocationField from '@/components/ui/location-field'
import OptionalFormSection, { useOptionalFields } from '@/components/ui/optional-form-section'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'
import OptionalFieldsManager, { type OptionalField } from '@/components/ui/optional-fields-manager'
import { parseDateInput } from '@/lib/date-utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

// Define optional fields configuration for events
const EVENT_OPTIONAL_FIELDS: OptionalField[] = [
  {
    key: 'description',
    label: 'Description',
    description: 'Brief description of the event',
  },
  {
    key: 'endDate',
    label: 'End Date',
    description: 'Optional end date for the event',
  },
  {
    key: 'location',
    label: 'Location',
    description: 'Event location information',
  },
  {
    key: 'notes',
    label: 'Notes',
    description: 'Additional notes about this event',
  },
  {
    key: 'metadata',
    label: 'Metadata',
    description: 'Custom metadata fields',
  },
]
import { Trash2, Eye } from 'lucide-react'
import ProductionSourcePreview from './ProductionSourcePreview'
import { formatProductionSourceLabel } from '@/lib/utils/production-source-utils'

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
  organizations: OrganizationRole[]
}

interface DocumentEditData {
  id: string
  file: File
  fileType: FileType
  fileExtension: FileExtension
  title: string
  description: string
  metadata: MetadataItem[]
  organizations: OrganizationRole[]
}

// Form data interface
interface EACertificateFormData extends Omit<CreateEACertificateData, 'documents'> {
  documents: UploadedDocument[]
}

export default function EACertificateSplitForm({ mode, certificateId, backHref }: EACertificateSplitFormProps) {
  const router = useRouter()
  const { visibleOptionalFields, setVisibleOptionalFields } = useOptionalFields()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [productionSources, setProductionSources] = useState<Array<{ id: string; name: string | null }>>([])
  // UI state scoped per certificate
  const [selectedDocumentIdByCert, setSelectedDocumentIdByCert] = useState<Record<number, string | null>>({})
  const [isMultiCreate, setIsMultiCreate] = useState(false)
  const [psSheetOpen, setPsSheetOpen] = useState(false)
  const [previewPsId, setPreviewPsId] = useState<string | null>(null)
  const [previewPs, setPreviewPs] = useState<any>(null)
  const [isLoadingPsPreview, setIsLoadingPsPreview] = useState(false)
  // Removed created entity state as inline creation UI was removed
  // Multiple certificates support (single active view for now)
  const [activeCertificateIndex, setActiveCertificateIndex] = useState(0)
  // Documents are shared across all certificates in multi-create mode
  const [sharedDocuments, setSharedDocuments] = useState<UploadedDocument[]>([])
  const [certificates, setCertificates] = useState<EACertificateFormData[]>([
    {
      type: EACType.REC,
      type2: '', // Additional certificate type information
      amounts: [],
      organizations: [], // Start with no organizations
      links: [],
      documents: [],
      productionSourceId: undefined,
      productionTech: '', // Production technology
    },
  ])
  const [eventsByCert, setEventsByCert] = useState<Record<number, Array<{
    type: string
    description?: string
    dates: { start?: string; end?: string }
    location?: any
    organizations?: any[]
    notes?: string
    links?: string[]
    metadata: MetadataItem[]
  }>>>({
    0: [
      { type: '', description: '', dates: {}, location: {} as any, organizations: [], notes: '', links: [], metadata: [] }
    ]
  })
  const [attachedDocumentIds, setAttachedDocumentIds] = useState<string[]>([])
  // Load attached documents in edit mode
  useEffect(() => {
    const load = async () => {
      if (mode !== 'edit' || !certificateId) return
      try {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from('eacertificates')
          .select('documents')
          .eq('id', certificateId)
          .maybeSingle()
        if (error) throw error
        setAttachedDocumentIds(Array.isArray(data?.documents) ? (data!.documents as string[]) : [])
      } catch (_) {
        setAttachedDocumentIds([])
      }
    }
    load()
  }, [mode, certificateId])
  
  // Backwards-compatible accessors for current certificate (with safe fallback)
  const formData = certificates[activeCertificateIndex] ?? {
    type: EACType.REC,
    type2: '', // Additional certificate type information
    amounts: [],
    organizations: [], // Start with no organizations
    links: [],
    documents: [],
    productionSourceId: undefined,
  }
  const setFormData = (
    next:
      | EACertificateFormData
      | ((prev: EACertificateFormData) => EACertificateFormData)
  ) => {
    setCertificates((prev) => {
      const nextCertificates = [...prev]
      const current = prev[activeCertificateIndex]
      const updated = typeof next === 'function' ? (next as any)(current) : next
      nextCertificates[activeCertificateIndex] = updated
      return nextCertificates
    })
  }

  const selectedDocumentId = selectedDocumentIdByCert[activeCertificateIndex] ?? null
  const [showEditModal, setShowEditModal] = useState(false)
  const selectedDocument = React.useMemo(() => {
    const docs = sharedDocuments
    return selectedDocumentId 
      ? docs.find(doc => doc.id === selectedDocumentId) || null
      : docs[0] || null
  }, [selectedDocumentId, sharedDocuments])

  // Event management functions
  const currentEvents = eventsByCert[activeCertificateIndex] ?? []

  const addEvent = () => {
    setEventsByCert(prev => ({
      ...prev,
      [activeCertificateIndex]: [
        ...(prev[activeCertificateIndex] ?? []),
        { type: '', description: '', dates: {}, location: {} as any, organizations: [], notes: '', links: [], metadata: [] }
      ]
    }))
  }

  const removeEvent = (index: number) => {
    setEventsByCert(prev => ({
      ...prev,
      [activeCertificateIndex]: (prev[activeCertificateIndex] ?? []).filter((_, i) => i !== index)
    }))
  }

  const updateEvent = (index: number, field: string, value: any) => {
    setEventsByCert(prev => ({
      ...prev,
      [activeCertificateIndex]: (prev[activeCertificateIndex] ?? []).map((event, i) =>
      i === index ? { ...event, [field]: value } : event
      )
    }))
  }

  const addCertificate = () => {
    setCertificates(prev => {
      const next = [
        ...prev,
        { type: EACType.REC, amounts: [], links: [], documents: [], productionSourceId: undefined },
      ]
      const newIndex = next.length - 1
      setActiveCertificateIndex(newIndex)
      setEventsByCert(ev => ({
        ...ev,
        [newIndex]: [
          { type: '', description: '', dates: {}, location: {} as any, organizations: [], notes: '', links: [], metadata: [] },
        ],
      }))
      setSelectedDocumentIdByCert(map => ({ ...map, [newIndex]: null }))
      return next
    })
  }

  const removeCertificateAt = (index: number) => {
    setCertificates(prev => {
      if (prev.length <= 1) {
        // Reset to a single empty certificate
        setEventsByCert({ 0: [{ type: '', description: '', dates: {}, location: {} as any, organizations: [], notes: '', links: [], metadata: [] }] })
        setSelectedDocumentIdByCert({ 0: null })
        setActiveCertificateIndex(0)
        return [{ type: EACType.REC, amounts: [], links: [], documents: [], productionSourceId: undefined }]
      }
      const next = prev.filter((_, i) => i !== index)
      // Reindex per-certificate maps based on the removed index
      setEventsByCert(ev => {
        const updated: Record<number, any[]> = {}
        next.forEach((_, i) => {
          const sourceIndex = i >= index ? i + 1 : i
          updated[i] = ev[sourceIndex] ?? []
        })
        return updated
      })
      setSelectedDocumentIdByCert(map => {
        const updated: Record<number, string | null> = {}
        next.forEach((_, i) => {
          const sourceIndex = i >= index ? i + 1 : i
          updated[i] = map[sourceIndex] ?? null
        })
        return updated
      })
      setActiveCertificateIndex(curr => {
        if (curr > index) return curr - 1
        if (curr === index) return Math.max(0, curr - 1)
        return curr
      })
      return next
    })
  }

  const handleSubmitAll = async () => {
    setSubmitting(true)
    try {
      for (let idx = 0; idx < certificates.length; idx++) {
        const data = certificates[idx]
        // Basic validation per certificate
        if (!data.externalIDs || data.externalIDs.length === 0) {
          throw new Error(`Certificate ${idx + 1}: at least one external ID is required`)
        }
        if (!data.amounts || data.amounts.length === 0) {
          throw new Error(`Certificate ${idx + 1}: at least one amount is required`)
        }

        const serviceData = { ...data, documents: [], productionSourceId: data.productionSourceId }
        const certificate = await createEACertificate(serviceData)

        // Upload documents
        let uploadedDocIds: string[] = []
        if (data.documents.length > 0) {
          const supabase = createClientComponentClient()
          await Promise.all(
            data.documents.map(async (doc) => {
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
          if (uploadedDocIds.length > 0) {
            await supabase
              .from('eacertificates')
              .update({ documents: uploadedDocIds })
              .eq('id', certificate.id)
          }
        }

        // Events for this certificate
        const certEvents = (eventsByCert[idx] ?? []).filter(e => (e.type || '').trim() !== '')
        if (certEvents.length > 0) {
          const createEventPromises = certEvents.map(event => {
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
              metadata: event.metadata,
              documents: uploadedDocIds.length > 0 ? uploadedDocIds.map((id, index) => ({
                id,
                url: '',
                fileType: data.documents[index]?.fileType || 'PDF',
                title: data.documents[index]?.title || '',
                description: data.documents[index]?.description || '',
                metadata: data.documents[index]?.metadata || [],
                organizations: data.documents[index]?.organizations || [],
              })) : undefined,
            }
            return createEvent(payload)
          })
          await Promise.all(createEventPromises)
        }
      }
      toast.success(`Created ${certificates.length} certificate(s) successfully`)
      router.push('/eacertificates')
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to create certificates')
    } finally {
      setSubmitting(false)
    }
  }

  const loadProductionSources = async () => {
    try {
      const sources = await listProductionSources()
      setProductionSources(sources)
    } catch (error) {
      console.error('Failed to load production sources:', error)
    }
  }

  const handlePreviewProductionSource = async (psId: string) => {
    if (previewPsId === psId) {
      setPreviewPsId(null)
      setPreviewPs(null)
      return
    }

    setIsLoadingPsPreview(true)
    try {
      const ps = await getProductionSource(psId)
      setPreviewPs(ps)
      setPreviewPsId(psId)
    } catch (error) {
      console.error('Failed to load production source:', error)
      toast.error('Failed to load production source details')
    } finally {
      setIsLoadingPsPreview(false)
    }
  }

  useEffect(() => {

    const loadCertificate = async () => {
      if (mode === 'edit' && certificateId) {
        try {
          setLoading(true)
          const certificate = await getEACertificate(certificateId)
          setCertificates([
            {
            type: certificate.type,
            type2: certificate.type2 || '',
            externalIDs: certificate.external_ids || [],
            amounts: certificate.amounts || [],
            emissions: certificate.emissions || [],
            organizations: certificate.organizations || [],
            links: certificate.links || [],
            documents: [], // We'll need to fetch documents separately
            productionSourceId: certificate.production_source_id || undefined,
            productionTech: certificate.production_tech || '',
            },
          ])
          
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
    if (sharedDocuments.length > 0 && !selectedDocumentId) {
      setSelectedDocumentIdByCert(prev => ({
        ...prev,
        [activeCertificateIndex]: sharedDocuments[0].id,
      }))
    }
  }, [sharedDocuments, selectedDocumentId, activeCertificateIndex])

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

    setSharedDocuments(prev => ([...prev, ...newDocuments]))
  }

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentIdByCert(prev => ({ ...prev, [activeCertificateIndex]: documentId }))
  }

  const handleDocumentRemove = (documentId: string) => {
    setSharedDocuments(prev => prev.filter(doc => doc.id !== documentId))

    // Update selectedDocumentId after state update
    if (selectedDocumentId === documentId) {
      const remainingDocs = sharedDocuments.filter(doc => doc.id !== documentId)
      setSelectedDocumentIdByCert(prev => ({
        ...prev,
        [activeCertificateIndex]: remainingDocs.length > 0 ? remainingDocs[0].id : null,
      }))
    }
  }

  const handleDocumentUpdate = (documentId: string, updates: Partial<DocumentEditData>) => {
    setSharedDocuments(prev => prev.map(doc => {
      if (doc.id !== documentId) return doc
      
      const updatedDoc: UploadedDocument = { ...doc }
      
      // Apply updates, converting metadata format if needed
      if (updates.title !== undefined) updatedDoc.title = updates.title
      if (updates.description !== undefined) updatedDoc.description = updates.description
      if (updates.fileType !== undefined) updatedDoc.fileType = updates.fileType
      if (updates.fileExtension !== undefined) updatedDoc.fileExtension = updates.fileExtension
      if (updates.organizations !== undefined) updatedDoc.organizations = updates.organizations
      
      // Convert metadata format if needed
      if (updates.metadata) {
        updatedDoc.metadata = updates.metadata.map(item => ({
          key: item.key,
          label: item.label,
          value: item.value || ''
        }))
      }
      
      return updatedDoc
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
        // Convert form data to service format (without documents for now)
        const serviceData = {
          ...formData,
          productionSourceId: formData.productionSourceId,
          documents: [] // Start with empty documents, will update after upload
        }
        
        // Create certificate first
        const certificate = await createEACertificate(serviceData)
        
        // Upload documents if any exist and collect their IDs
        let uploadedDocIds: string[] = []
        if (sharedDocuments.length > 0) {
          const supabase = createClientComponentClient()
          
          await Promise.all(
            sharedDocuments.map(async (doc) => {
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
        const validEvents = currentEvents.filter(event => event.type.trim() !== '')
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
              metadata: event.metadata,
              // Include shared documents if any exist
              documents: uploadedDocIds.length > 0 ? uploadedDocIds.map((id, index) => ({
                id,
                url: '', // Will be populated by the service
                fileType: sharedDocuments[index]?.fileType || 'PDF',
                title: sharedDocuments[index]?.title || '',
                description: sharedDocuments[index]?.description || '',
                metadata: sharedDocuments[index]?.metadata || [],
                organizations: sharedDocuments[index]?.organizations || [],
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
      <div className="min-h-screen bg-background">
        <div className="p-6">
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
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="bg-white shadow rounded-lg">
          <div className="flex items-center gap-2 p-6 border-b">
            <BackButton />
            <h1 className="text-2xl font-semibold">
              {mode === 'create' ? 'Create EACertificate' : 'Edit EACertificate'}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[calc(100vh-200px)]">
            {/* Left Side - Documents */}
            <div className="border-r border-gray-200 p-6">
              {mode === 'edit' ? (
                <AttachedDocumentsPanel documentIds={attachedDocumentIds} />
              ) : (
                sharedDocuments.length === 0 ? (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
                    <Dropzone
                      onFilesAccepted={handleFilesUploaded}
                      maxFiles={10}
                      className="h-64"
                    />
                  </div>
                ) : (
                  // When files exist: cards list, preview, and details
                  <div className="flex flex-col h-full">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">Uploaded Documents</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
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
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {sharedDocuments.map((doc) => (
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
                            onEdit={() => setShowEditModal(true)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 mt-4">
                      <div className="sticky top-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
                        <FileViewer
                          file={selectedDocument?.file}
                          fileType={selectedDocument?.fileType}
                          fileExtension={selectedDocument?.fileExtension}
                          title={selectedDocument?.title}
                          className="h-[calc(100vh-100px)]"
                        />
                      </div>
                    </div>

                  </div>
                )
              )}
            </div>

            {/* Right Side - Form */}
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === 'create' && (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Do you want to create multiple certificates?</div>
                      <div className="text-xs text-muted-foreground">Toggle to switch between single and multiple creation modes.</div>
                      </div>
                    <Switch checked={isMultiCreate} onCheckedChange={setIsMultiCreate} />
                    </div>
                  )}
                  
                {isMultiCreate && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Certificates</div>
                        <div className="text-xs text-muted-foreground">Click a card to edit that certificate</div>
                </div>
                      <Button type="button" size="sm" variant="outline" onClick={addCertificate} className="mb-4">+ Add certificate</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
                      {certificates.map((cert, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveCertificateIndex(idx)}
                          role="button"
                          tabIndex={0}
                          className={`cursor-pointer text-left rounded-lg border p-4 transition-colors ${idx === activeCertificateIndex ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <div
                                className="font-medium truncate"
                                title={`Certificate ${cert.externalIDs?.find(e => (e?.id ?? '').trim() !== '')?.id ?? (idx + 1)}`}
                              >
                                Certificate {cert.externalIDs?.find(e => (e?.id ?? '').trim() !== '')?.id ?? (idx + 1)}
                              </div>
                              <div
                                className="text-xs text-gray-500 mt-1 truncate"
                                title={(cert.amounts ?? []).map(a => `${a.amount} ${a.unit}`).join(', ') || 'No amounts'}
                              >
                                {((cert.amounts ?? []).map(a => `${a.amount} ${a.unit}`).join(', ') || 'No amounts')}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeCertificateAt(idx) }}
                              className="text-gray-400 hover:text-red-600"
                              aria-label="Remove certificate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <React.Fragment>

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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Production Source (Optional)
                    </label>
                    {formData.productionSourceId && formData.productionSourceId !== 'none' && (
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        onClick={() => handlePreviewProductionSource(formData.productionSourceId!)}
                        disabled={isLoadingPsPreview}
                      >
                        <Eye className="h-3 w-3" />
                        {isLoadingPsPreview ? 'Loading...' : 'Preview'}
                      </button>
                    )}
                  </div>
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
                  <div className="text-xs mt-2">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700"
                      onClick={(e) => {
                        e.preventDefault()
                        setPsSheetOpen(true)
                      }}
                    >
                      Can't find it? Create a new production source
                    </button>
                  </div>
                </div>

                {/* 6. Production Technology */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Technology (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.productionTech || ''}
                    onChange={(e) => setFormData({ ...formData, productionTech: e.target.value })}
                    placeholder="e.g. Solar, Wind, Hydro, Biomass, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 7. Organizations */}
                <OrganizationRoleField
                  value={formData.organizations || []}
                  onChange={(value) => setFormData({ ...formData, organizations: value })}
                  label="Organizations (Optional)"
                  description="Assign roles to organizations for this certificate"
                  sharedDocuments={sharedDocuments}
                  selectedDocumentId={selectedDocumentId}
                />

                {/* 8. Events Section - only show in create mode */}
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
                      {currentEvents.map((event, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-medium text-gray-700">Event {index + 1}</h4>
                            <div className="flex items-center gap-2">
                              <OptionalFieldsManager
                                fields={EVENT_OPTIONAL_FIELDS}
                                visibleFields={visibleOptionalFields}
                                onFieldsChange={setVisibleOptionalFields}
                                buttonText="Optional fields"
                              />
                              {currentEvents.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeEvent(index)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormFieldWrapper label="Event Type" required>
                              <input
                                type="text"
                                value={event.type}
                                onChange={(e) => updateEvent(index, 'type', e.target.value)}
                                placeholder="e.g. Generation, Transfer, Retirement"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                              />
                            </FormFieldWrapper>

                            <FormFieldWrapper 
                              label="Description" 
                              visible={visibleOptionalFields.includes('description')}
                            >
                              <input
                                type="text"
                                value={event.description || ''}
                                onChange={(e) => updateEvent(index, 'description', e.target.value)}
                                placeholder="Brief description of the event"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </FormFieldWrapper>

                            <FormFieldWrapper label="Start Date" required>
                              <DatePicker
                                value={event.dates.start ? new Date(event.dates.start) : undefined}
                                onChange={(date) => updateEvent(index, 'dates', { ...event.dates, start: date ? format(date, 'yyyy-MM-dd') : '' })}
                                placeholder="Select start date"
                              />
                            </FormFieldWrapper>

                            <FormFieldWrapper 
                              label="End Date" 
                              visible={visibleOptionalFields.includes('endDate')}
                            >
                              <DatePicker
                                value={event.dates.end ? new Date(event.dates.end) : undefined}
                                onChange={(date) => updateEvent(index, 'dates', { ...event.dates, end: date ? format(date, 'yyyy-MM-dd') : '' })}
                                placeholder="Select end date (optional)"
                              />
                            </FormFieldWrapper>

                            <div className="md:col-span-2">
                              <FormFieldWrapper 
                                label="Location" 
                                visible={visibleOptionalFields.includes('location')}
                              >
                                <LocationField
                                  value={event.location || {}}
                                  onChange={(location) => updateEvent(index, 'location', location)}
                                />
                              </FormFieldWrapper>
                            </div>

                            <div className="md:col-span-2">
                              <FormFieldWrapper 
                                label="Notes" 
                                visible={visibleOptionalFields.includes('notes')}
                              >
                                <textarea
                                  value={event.notes || ''}
                                  onChange={(e) => updateEvent(index, 'notes', e.target.value)}
                                  placeholder="Additional notes about this event"
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </FormFieldWrapper>
                            </div>

                            <div className="md:col-span-2">
                              <FormFieldWrapper 
                                label="Metadata" 
                                visible={visibleOptionalFields.includes('metadata')}
                              >
                                <MetadataField
                                  value={event.metadata}
                                  onChange={(v) => updateEvent(index, 'metadata', v)}
                                  label="Metadata"
                                  description="Add custom metadata fields for this event"
                                />
                              </FormFieldWrapper>
                            </div>
                          </div>
                        </div>
                      ))}
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


                {/* Document Management moved to left column */}

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  
                  {!isMultiCreate && (
                  <Button
                    type="submit"
                    disabled={submitting || !formData.amounts || formData.amounts.length === 0 || !formData.externalIDs || formData.externalIDs.length === 0}
                  >
                    {submitting ? 'Saving...' : mode === 'create' ? 'Create Certificate' : 'Update Certificate'}
                  </Button>
                  )}
                </div>

                {isMultiCreate && (
                  <div className="flex flex-col items-center gap-4">
                    {/* <Button type="button" variant="outline" onClick={addCertificate} className="mx-auto mb-6">+ Add certificate</Button> */}
                    <Button type="button" onClick={handleSubmitAll} disabled={submitting} className="w-full">
                      {submitting ? 'Creating…' : 'Create Certificates'}
                    </Button>
                  </div>
                )}
                  </React.Fragment>
              </form>
            </div>
          </div>
          
          {/* Production Source creation sheet */}
          <Sheet open={psSheetOpen} onOpenChange={setPsSheetOpen}>
            <SheetContent side="right" className="w-[90vw] max-w-[90vw]">
              <div className="flex h-full">
                {/* Document Preview Section */}
                <div className="w-1/2 border-r border-gray-200 p-4">
                  <div className="h-full flex flex-col">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
                    <div className="flex-1 min-h-0">
                      <FileViewer
                        file={selectedDocument?.file}
                        fileType={selectedDocument?.fileType}
                        fileExtension={selectedDocument?.fileExtension}
                        title={selectedDocument?.title}
                        className="h-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Section */}
                <div className="w-1/2 flex flex-col">
                  <SheetHeader className="p-4 pb-0">
                    <SheetTitle>Create Production Source</SheetTitle>
                    <SheetDescription>
                      We'll reuse the documents you uploaded for this certificate.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-4 pt-0 flex-1 overflow-y-auto">
                    <ProductionSourceCollapsibleForm
                      onProductionSourceCreated={(s) => {
                        setPsSheetOpen(false)
                        toast.success('Production source created')
                        // Prefill into active certificate
                        setFormData(prev => ({ ...prev, productionSourceId: s.id }))
                        // Ensure the selector contains the new option
                        setProductionSources(prev => {
                          const exists = prev.some(ps => ps.id === s.id)
                          return exists ? prev : [...prev, { id: s.id, name: s.name }]
                        })
                      }}
                      sharedDocuments={sharedDocuments}
                      defaultExpanded
                      hideHeader
                      plain
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>

      {/* Document Edit Sheet */}
      {selectedDocument && (
        <DocumentEditSheet
          document={selectedDocument}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleDocumentUpdate}
        />
      )}

      {/* Production Source Preview Sheet */}
      <Sheet open={previewPsId !== null} onOpenChange={(open) => {
        if (!open) {
          setPreviewPsId(null)
          setPreviewPs(null)
        }
      }}>
        <SheetContent side="right" className="w-[60vw] max-w-[60vw]">
          <SheetHeader>
            <SheetTitle>Production Source Preview</SheetTitle>
            <SheetDescription>
              View production source details (read-only)
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 pt-0 flex-1 overflow-y-auto">
            {previewPs ? (
              <ProductionSourcePreview productionSource={previewPs} />
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-gray-500">Loading production source details...</div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
