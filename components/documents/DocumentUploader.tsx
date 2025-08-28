"use client"

import React, { useRef, useState } from 'react'
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
    setItems(prev => {
      const next = [
        ...prev,
        {
          localId: crypto.randomUUID(),
          fileType: FileType.ORGANIZATION_DOCUMENT,
          title: '',
          description: '',
          metadata: [],
          organizations: props.defaultOrganizations,
        },
      ]
      props.onChange?.(next)
      return next
    })
  }

  const removeItem = (localId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.localId !== localId)
      props.onChange?.(next)
      return next
    })
  }

  const updateItem = (localId: string, patch: Partial<DocumentFormItem>) => {
    setItems(prev => {
      const next = prev.map(i => (i.localId === localId ? { ...i, ...patch } : i))
      props.onChange?.(next)
      return next
    })
  }

  const uploadAll = async () => {
    setUploading(true)
    try {
      const updated: DocumentFormItem[] = []
      for (const item of items) {
        if (item.file && !item.createdRowId) {
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
      props.onChange?.(updated)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="font-medium">Documents</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addItem}>Add document</Button>
          <Button type="button" onClick={uploadAll} disabled={uploading || items.length === 0}>
            {uploading ? 'Uploading…' : 'Upload all'}
          </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">File</label>
                  <Input type="file" onChange={e => updateItem(item.localId, { file: e.target.files?.[0] })} />
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
                    <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                  ))}
                  <Button type="button" variant="outline" onClick={() => updateItem(item.localId, { metadata: [...(item.metadata ?? []), { key: '', label: '', value: '' }] })}>Add metadata</Button>
                </div>
              </div>
              {item.url ? (
                <div className="text-xs text-green-700">Uploaded: {item.url}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
