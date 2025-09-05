"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileType, FILE_TYPE_NAMES, MetadataItem, OrganizationRole } from '@/lib/types/eacertificate'
import { uploadAndCreateDocument } from '@/lib/services/documents'

export interface DocumentFormItem {
  localId: string
  file?: File
  url?: string
  fileType: FileType
  title: string
  description?: string
  metadata: MetadataItem[]
  organizations?: OrganizationRole[]
  createdRowId?: string
}

export interface DocumentUploaderProps {
  defaultItems?: DocumentFormItem[]
  defaultOrganizations?: OrganizationRole[]
  onChange?: (items: DocumentFormItem[]) => void
}

export default function DocumentUploader(props: DocumentUploaderProps) {
  const [items, setItems] = useState<DocumentFormItem[]>(
    props.defaultItems ?? []
  )  
  const [uploading, setUploading] = useState(false)

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        fileType: '' as any, // No default - user must select
        title: '',
        description: '',
        metadata: [],
        organizations: props.defaultOrganizations,
      },
    ])
  }

  const removeItem = (localId: string) => {
    setItems(prev => prev.filter(i => i.localId !== localId))
  }

  const updateItem = (localId: string, patch: Partial<DocumentFormItem>) => {
    setItems(prev => prev.map(i => (i.localId === localId ? { ...i, ...patch } : i)))
  }

  const uploadAll = async () => {
    setUploading(true)
    try {
      const updated: DocumentFormItem[] = []
      for (const item of items) {
        if (item.file && !item.createdRowId) {
          // Validate file type selection
          if (!item.fileType) {
            alert(`Please select a file type for "${item.file.name}".`)
            continue
          }

          // Validate file extension
          const fileExtension = item.file.name.split('.').pop()?.toLowerCase()
          if (fileExtension !== 'pdf' && fileExtension !== 'csv') {
            alert(`File "${item.file.name}" is not a valid file type. Only PDF and CSV files are allowed.`)
            continue
          }

          const row = await uploadAndCreateDocument({
            file: item.file,
            fileName: item.file.name,
            fileType: item.fileType,
            title: item.title,
            description: item.description,
            metadata: item.metadata,
            organizations: item.organizations,
          })
          updated.push({ ...item, createdRowId: row.id, url: row.url })
        } else {
          updated.push(item)
        }
      }
      setItems(updated)
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    props.onChange?.(items)
  }, [items])

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="font-medium">Documents</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addItem}>Add document</Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-500">No documents added yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.localId} className="border rounded p-3 space-y-3">
              <div className="flex justify-between">
                <div className="text-sm text-gray-600">Document {idx + 1}</div>
                <Button type="button" variant="ghost" onClick={() => removeItem(item.localId)}>Remove</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">File</label>
                  <Input 
                    type="file" 
                    accept=".pdf,.csv"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const fileExtension = file.name.split('.').pop()?.toLowerCase()
                        if (fileExtension !== 'pdf' && fileExtension !== 'csv') {
                          alert(`File "${file.name}" is not a valid file type. Only PDF and CSV files are allowed.`)
                          e.target.value = '' // Clear the input
                          return
                        }
                      }
                      updateItem(item.localId, { file })
                    }} 
                  />
                  <p className="text-xs text-gray-400 mt-1">Only PDF and CSV files are allowed</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={item.fileType}
                    onChange={e => updateItem(item.localId, { fileType: e.target.value as FileType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select file type...</option>
                    {Object.entries(FILE_TYPE_NAMES).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Title</label>
                  <Input value={item.title} onChange={e => updateItem(item.localId, { title: e.target.value })} placeholder="Document title" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <Textarea value={item.description} onChange={e => updateItem(item.localId, { description: e.target.value })} rows={3} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Metadata (key/label/value)</label>
                <div className="space-y-2">
                  {(item.metadata ?? []).map((m, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                        <Input placeholder="key" value={m.key} onChange={e => {
                          const metadata = [...(item.metadata ?? [])]
                          metadata[i] = { ...metadata[i], key: e.target.value }
                          updateItem(item.localId, { metadata })
                        }} />
                        <Input placeholder="label" value={m.label} onChange={e => {
                          const metadata = [...(item.metadata ?? [])]
                          metadata[i] = { ...metadata[i], label: e.target.value }
                          updateItem(item.localId, { metadata })
                        }} />
                        <Input placeholder="value" value={m.value ?? ''} onChange={e => {
                          const metadata = [...(item.metadata ?? [])]
                          metadata[i] = { ...metadata[i], value: e.target.value }
                          updateItem(item.localId, { metadata })
                        }} />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const metadata = [...(item.metadata ?? [])]
                          metadata.splice(i, 1)
                          updateItem(item.localId, { metadata })
                        }}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => updateItem(item.localId, { metadata: [...(item.metadata ?? []), { key: '', label: '', value: '' }] })}>Add metadata</Button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Organizations</label>
                <div className="space-y-2">
                  {(item.organizations ?? []).map((org, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                        <Input placeholder="Organization ID" value={org.orgId} onChange={e => {
                          const organizations = [...(item.organizations ?? [])]
                          organizations[i] = { ...organizations[i], orgId: e.target.value }
                          updateItem(item.localId, { organizations })
                        }} />
                        <Input placeholder="Role" value={org.role} onChange={e => {
                          const organizations = [...(item.organizations ?? [])]
                          organizations[i] = { ...organizations[i], role: e.target.value }
                          updateItem(item.localId, { organizations })
                        }} />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const organizations = [...(item.organizations ?? [])]
                          organizations.splice(i, 1)
                          updateItem(item.localId, { organizations })
                        }}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => updateItem(item.localId, { organizations: [...(item.organizations ?? []), { orgId: '', role: '' }] })}>Add organization</Button>
                </div>
              </div>
              {/* Success messaging is handled globally via toasts in the parent flow */}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
