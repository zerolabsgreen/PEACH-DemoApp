"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createProductionSource, updateProductionSource, getProductionSource } from '@/lib/services/production-sources'
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { toast } from 'sonner'
import LocationField from '@/components/ui/location-field'
import LinksField from '@/components/ui/links-field'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import MetadataField from '@/components/ui/metadata-field'
import Dropzone from '@/components/documents/Dropzone'
import FileViewer from '@/components/documents/FileViewer'
import DocumentCard from '@/components/documents/DocumentCard'
import AttachedDocumentsPanel from '@/components/documents/AttachedDocumentsPanel'
import { createClientComponentClient } from '@/lib/supabase'
import { FileType, FILE_TYPE_NAMES } from '@/lib/types/eacertificate'
import { FileExtension } from '@/components/documents/FileViewer'
import type { Location, ExternalID, MetadataItem, OrganizationRole } from '@/lib/types/eacertificate'

export interface ProductionSourceSplitFormProps {
  mode: 'create' | 'edit'
  productionSourceId?: string
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

interface ProductionSourceFormData {
  name: string
  description: string
  location: Location
  links: string[]
  technology: string
  documents: UploadedDocument[]
  externalIDs: ExternalID[]
  relatedProductionSources: ExternalID[]
  metadata: MetadataItem[]
}

export default function ProductionSourceSplitForm({ mode, productionSourceId, backHref }: ProductionSourceSplitFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [attachedDocumentIds, setAttachedDocumentIds] = useState<string[]>([])
  
  const [formData, setFormData] = useState<ProductionSourceFormData>({
    name: '',
    description: '',
    location: { country: '', city: '', state: '', address: '', postalCode: '' },
    links: [],
    technology: '',
    documents: [],
    externalIDs: [],
    relatedProductionSources: [],
    metadata: [],
  })

  const selectedDocument = React.useMemo(() => {
    return selectedDocumentId 
      ? formData.documents.find(doc => doc.id === selectedDocumentId)
      : formData.documents[0] || null
  }, [selectedDocumentId, formData.documents])

  // Auto-select first document when documents are added
  React.useEffect(() => {
    if (formData.documents.length > 0 && !selectedDocumentId) {
      setSelectedDocumentId(formData.documents[0].id)
    }
  }, [formData.documents, selectedDocumentId])

  // Load production source data for edit mode
  React.useEffect(() => {
    const loadProductionSourceData = async () => {
      if (mode !== 'edit' || !productionSourceId) return
      try {
        const productionSource = await getProductionSource(productionSourceId)
        setFormData({
          name: productionSource.name || '',
          description: productionSource.description || '',
          location: productionSource.location || { country: '', city: '', state: '', address: '', postalCode: '' },
          links: productionSource.links || [],
          technology: productionSource.technology || '',
          documents: [],
          externalIDs: productionSource.external_ids || [],
          // @ts-ignore
          relatedProductionSources: productionSource.related_production_sources || [],
          metadata: productionSource.metadata || [],
        })
      } catch (error) {
        console.error('Failed to load production source:', error)
        toast.error('Failed to load production source data')
      }
    }
    loadProductionSourceData()
  }, [mode, productionSourceId])

  // Load attached documents in edit mode
  React.useEffect(() => {
    const load = async () => {
      if (mode !== 'edit' || !productionSourceId) return
      try {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from('production_sources')
          .select('documents')
          .eq('id', productionSourceId)
          .maybeSingle()
        if (error) throw error
        setAttachedDocumentIds(Array.isArray(data?.documents) ? (data!.documents as string[]) : [])
      } catch (_) {
        setAttachedDocumentIds([])
      }
    }
    load()
  }, [mode, productionSourceId])

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
    setSaving(true)

    try {
      if (mode === 'create') {
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

        // Then, upload documents if any exist
        if (formData.documents.length > 0) {
          const uploadedDocIds: string[] = []
          
          for (const doc of formData.documents) {
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
            await updateProductionSource(source.id, {
              documents: uploadedDocIds.map(id => ({ id } as any)),
            })
          }
        }
        
        toast.success('Production source created')
        router.push('/production-sources')
      } else if (mode === 'edit' && productionSourceId) {
        // Update production source (excluding documents)
        const { documents, ...updateData } = formData
        await updateProductionSource(productionSourceId, updateData)
        
        // Upload new documents if any exist
        if (formData.documents.length > 0) {
          const supabase = createClientComponentClient()
          const uploadedDocIds: string[] = []
          
          await Promise.all(
            formData.documents.map(async (doc) => {
              const uploadedDoc = await uploadAndCreateDocument({
                file: doc.file,
                fileName: doc.file.name,
                fileType: doc.fileType,
                title: doc.title,
                description: doc.description,
                metadata: doc.metadata,
                organizations: [{ orgId: productionSourceId, role: 'owner', orgName: formData.name || 'Production Source' }],
              })
              uploadedDocIds.push(uploadedDoc.id)
            })
          )
          
          // Update production source with new document IDs
          if (uploadedDocIds.length > 0) {
            const existingDocIds = attachedDocumentIds || []
            const allDocIds = [...existingDocIds, ...uploadedDocIds]
            await supabase
              .from('production_sources')
              .update({ documents: allDocIds })
              .eq('id', productionSourceId)
          }
        }
        
        toast.success('Production source updated')
        router.push(`/production-sources/${productionSourceId}`)
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save production source')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <BackButton />
          <h1 className="text-2xl font-semibold">
            {mode === 'create' ? 'Create Production Source' : 'Edit Production Source'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[calc(100vh-200px)]">
            {/* Left Side - Documents */}
            <div className="border-r border-gray-200 p-6">
              {mode === 'edit' ? (
                <AttachedDocumentsPanel documentIds={attachedDocumentIds} />
              ) : (
                formData.documents.length === 0 ? (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
                    <Dropzone
                      onFilesAccepted={handleFilesUploaded}
                      maxFiles={10}
                      className="h-64"
                    />
                  </div>
                ) : (
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
                )
              )}
            </div>

            {/* Right Side - Form */}
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                    rows={4} 
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
                          <Select
                            value={selectedDocument.fileType}
                            onValueChange={(value) => handleDocumentUpdate(selectedDocument.id, { fileType: value as FileType })}
                          >
                            <SelectTrigger className="w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(FILE_TYPE_NAMES).map(([key, name]) => (
                                <SelectItem key={key} value={key}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !formData.technology}
                  >
                    {saving ? 'Saving...' : mode === 'create' ? 'Create Production Source' : 'Update Production Source'}
                  </Button>
                </div>
              </form>
            </div>
        </div>
      </div>
    </div>
  )
}
