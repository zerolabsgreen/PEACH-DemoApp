"use client"

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BackButton } from '@/components/ui/back-button'
import DatePicker from '@/components/ui/date-picker'
import LinksField from '@/components/ui/links-field'
import LocationField from '@/components/ui/location-field'
import Dropzone from '@/components/documents/Dropzone'
import FileViewer from '@/components/documents/FileViewer'
import DocumentCard from '@/components/documents/DocumentCard'
import { createEvent, getEvent, updateEvent } from '@/lib/services/events'
import { listEACertificates } from '@/lib/services/eacertificates'
import { listProductionSources } from '@/lib/services/production-sources'
import { EventTarget, type CreateEventData, type UpdateEventData } from '@/lib/types/eacertificate'
import { toDateInputValue, parseDateInput } from '@/lib/date-utils'
import { format } from 'date-fns'
import { FileType, FILE_TYPE_NAMES } from '@/lib/types/eacertificate'
import { FileExtension } from '@/components/documents/FileViewer'

export interface EventSplitFormProps {
  mode: 'create' | 'edit'
  eventId?: string
  backHref: string
}

type TargetOption = {
  id: string
  label: string
  target: EventTarget
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

interface EventFormData {
  target: EventTarget
  targetId: string
  type: string
  description?: string
  dates: { start?: string; end?: string }
  location?: any
  organizations?: any[]
  notes?: string
  links?: string[]
  documents: UploadedDocument[]
}

export default function EventSplitForm({ mode, eventId, backHref }: EventSplitFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [targets, setTargets] = useState<TargetOption[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  const [formData, setFormData] = useState<EventFormData>({
    target: EventTarget.PSOURCE,
    targetId: '',
    type: '',
    description: '',
    dates: {},
    location: {} as any,
    organizations: [],
    notes: '',
    documents: [],
    links: [],
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

  useEffect(() => {
    const loadTargets = async () => {
      try {
        const [certs, sources] = await Promise.all([
          listEACertificates(),
          listProductionSources(),
        ])
        const certOptions: TargetOption[] = (certs ?? []).map((c: any) => ({
          id: c.id,
          label: `Certificate • ${c.type}`,
          target: EventTarget.EAC,
        }))
        const sourceOptions: TargetOption[] = (sources ?? []).map((s: any) => ({
          id: s.id,
          label: `Production Source • ${s.name ?? s.id}`,
          target: EventTarget.PSOURCE,
        }))
        let options = [...certOptions, ...sourceOptions]

        // Prefill from query params if provided
        const qpTarget = searchParams?.get('target') as keyof typeof EventTarget | null
        const qpTargetId = searchParams?.get('targetId')
        if (qpTargetId) {
          const parsedTarget = qpTarget && EventTarget[qpTarget]
          // If not present in fetched options, add a placeholder so the select shows the value
          if (!options.find(o => o.id === qpTargetId) && parsedTarget) {
            const labelPrefix = parsedTarget === EventTarget.EAC ? 'Certificate' : 'Production Source'
            options = [{ id: qpTargetId, label: `${labelPrefix} • ${qpTargetId}`, target: parsedTarget }, ...options]
          }
          setFormData(prev => ({
            ...prev,
            targetId: qpTargetId,
            target: (parsedTarget ?? prev.target) as EventTarget,
          }))
        }

        setTargets(options)
      } catch (_) {
        // ignore
      }
    }

    const loadExisting = async () => {
      if (mode === 'edit' && eventId) {
        setLoading(true)
        try {
          const ev = await getEvent(eventId)
          setFormData({
            target: ev.target,
            targetId: ev.target_id,
            type: ev.type,
            description: ev.description ?? '',
            dates: { start: toDateInputValue(ev.dates?.start), end: toDateInputValue(ev.dates?.end) },
            location: (ev.location ?? {}) as any,
            organizations: ev.organizations ?? [],
            notes: ev.notes ?? '',
            documents: [],
            links: ev.links ?? [],
          })
        } finally {
          setLoading(false)
        }
      }
    }

    loadTargets()
    loadExisting()
  }, [mode, eventId, searchParams])

  const handleTargetIdChange = (id: string) => {
    setFormData(prev => ({ ...prev, targetId: id }))
    const opt = targets.find(t => t.id === id)
    if (opt) setFormData(prev => ({ ...prev, target: opt.target }))
  }

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
        const payload: CreateEventData = {
          target: formData.target,
          targetId: formData.targetId,
          type: formData.type,
          description: formData.description,
          dates: {
            start: parseDateInput(formData.dates.start as string) || new Date(),
            ...(formData.dates.end ? { end: parseDateInput(formData.dates.end) || new Date() } : {}),
          },
          location: formData.location,
          organizations: formData.organizations,
          notes: formData.notes,
          links: formData.links,
        }
        await createEvent(payload)
      } else if (mode === 'edit' && eventId) {
        const patch: UpdateEventData = {
          target: formData.target,
          targetId: formData.targetId,
          type: formData.type,
          description: formData.description,
          dates: formData.dates.start || formData.dates.end
            ? {
                ...(formData.dates.start ? { start: parseDateInput(formData.dates.start) || new Date() } : {}),
                ...(formData.dates.end ? { end: parseDateInput(formData.dates.end) || new Date() } : {}),
              }
            : undefined,
          location: formData.location,
          organizations: formData.organizations,
          notes: formData.notes,
          links: formData.links,
        }
        await updateEvent(eventId, patch)
      }
      router.push(backHref)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <BackButton />
          <h1 className="text-2xl font-semibold">
            {mode === 'create' ? 'Create Event' : 'Edit Event'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Id<span className="text-red-600"> *</span></label>
                  <select
                    className="mt-1 block w-full border rounded px-3 py-2"
                    value={formData.targetId}
                    onChange={(e) => handleTargetIdChange(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select target…</option>
                    {targets.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Target is derived automatically from selection.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target</label>
                    <Input value={formData.target} readOnly disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type<span className="text-red-600"> *</span></label>
                    <Input 
                      value={formData.type} 
                      onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <Textarea 
                    value={formData.description} 
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                    rows={4} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DatePicker
                    label="Start date"
                    value={formData.dates.start ? parseDateInput(formData.dates.start) || undefined : undefined}
                    onChange={(date) => setFormData(prev => ({ 
                      ...prev, 
                      dates: { ...prev.dates, start: date ? format(date, 'yyyy-MM-dd') : undefined } 
                    }))}
                    required
                  />
                  <DatePicker
                    label="End date"
                    value={formData.dates.end ? parseDateInput(formData.dates.end) || undefined : undefined}
                    onChange={(date) => setFormData(prev => ({ 
                      ...prev, 
                      dates: { ...prev.dates, end: date ? format(date, 'yyyy-MM-dd') : undefined } 
                    }))}
                  />
                </div>

                <LocationField 
                  value={formData.location as any} 
                  onChange={(v) => setFormData(prev => ({ ...prev, location: v }))} 
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
                    rows={3} 
                  />
                </div>

                <LinksField 
                  value={formData.links ?? []} 
                  onChange={(v) => setFormData(prev => ({ ...prev, links: v }))} 
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
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !formData.type || !formData.targetId}
                  >
                    {saving ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Update Event'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
      </div>
    </div>
  )
}
