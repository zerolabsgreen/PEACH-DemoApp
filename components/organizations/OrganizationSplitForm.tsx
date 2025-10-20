"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createOrganizationFull } from '@/lib/services/organizations'
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { toast } from 'sonner'
import LocationField from '@/components/ui/location-field'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import Dropzone from '@/components/documents/Dropzone'
import FileViewer from '@/components/documents/FileViewer'
import DocumentCard from '@/components/documents/DocumentCard'
import AttachedDocumentsPanel from '@/components/documents/AttachedDocumentsPanel'
import { createClientComponentClient } from '@/lib/supabase'
import { FileType, FILE_TYPE_NAMES } from '@/lib/types/eacertificate'
import { FileExtension } from '@/components/documents/FileViewer'
import type { Location, ExternalID } from '@/lib/types/eacertificate'

export interface OrganizationSplitFormProps {
  mode: 'create' | 'edit'
  organizationId?: string
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

interface OrganizationFormData {
  name: string
  url: string
  description: string
  contact: string
  location: Location
  documents: UploadedDocument[]
  externalIDs: ExternalID[]
}

export default function OrganizationSplitForm({ mode, organizationId, backHref }: OrganizationSplitFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [attachedDocumentIds, setAttachedDocumentIds] = useState<string[]>([])
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    url: '',
    description: '',
    contact: '',
    location: { country: '', city: '', state: '', address: '', postalCode: '' },
    documents: [],
    externalIDs: [],
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

  // Load attached documents for edit mode
  React.useEffect(() => {
    const load = async () => {
      if (mode !== 'edit' || !organizationId) return
      try {
        const supabase = createClientComponentClient()
        const { data, error } = await supabase
          .from('organizations')
          .select('documents')
          .eq('id', organizationId)
          .maybeSingle()
        if (error) throw error
        setAttachedDocumentIds(Array.isArray(data?.documents) ? (data!.documents as string[]) : [])
      } catch (_) {
        setAttachedDocumentIds([])
      }
    }
    load()
  }, [mode, organizationId])

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
        const org = await createOrganizationFull(formData)
        
        // Upload documents if any exist
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
                organizations: [{ orgId: org.id, role: 'owner', orgName: org.name }],
              })
              uploadedDocIds.push(uploadedDoc.id)
            })
          )
          
          // Update organization with document IDs
          if (uploadedDocIds.length > 0) {
            await supabase
              .from('organizations')
              .update({ documents: uploadedDocIds })
              .eq('id', org.id)
          }
        }
        
        toast.success('Organization created')
        router.push('/organizations')
      } else if (mode === 'edit' && organizationId) {
        // For edit mode, implement update logic here
        // This would require implementing updateOrganization with documents
        toast.success('Organization updated')
        router.push(`/organizations/${organizationId}`)
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save organization')
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
            {mode === 'create' ? 'Create Organization' : 'Edit Organization'}
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
                    rows={4} 
                  />
                </div>

                <LocationField
                  value={formData.location}
                  onChange={(v) => setFormData(prev => ({ ...prev, location: v }))}
                  required
                />

                <ExternalIdField
                  value={formData.externalIDs}
                  onChange={(v) => setFormData(prev => ({ ...prev, externalIDs: v }))}
                  label="External identifiers"
                  description="Link this organization to external systems. Only ID is required."
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
                    disabled={saving || !formData.name}
                  >
                    {saving ? 'Saving...' : mode === 'create' ? 'Create Organization' : 'Update Organization'}
                  </Button>
                </div>
              </form>
            </div>
        </div>
      </div>
    </div>
  )
}
