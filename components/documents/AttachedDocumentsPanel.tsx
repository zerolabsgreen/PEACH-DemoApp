"use client"

import React from 'react'
import { getDocumentsByIds, type DocumentRecord } from '@/lib/services/documents'
import FileViewer from '@/components/documents/FileViewer'

export interface AttachedDocumentsPanelProps {
  documentIds: string[] | null | undefined
  className?: string
}

export default function AttachedDocumentsPanel({ documentIds, className = "" }: AttachedDocumentsPanelProps) {
  const [documents, setDocuments] = React.useState<DocumentRecord[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const load = async () => {
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        setDocuments([])
        setSelectedId(null)
        return
      }
      setLoading(true)
      try {
        const docs = await getDocumentsByIds(documentIds)
        setDocuments(docs)
        setSelectedId(docs[0]?.id ?? null)
      } catch (e) {
        // Silent fail; panel is auxiliary
        setDocuments([])
        setSelectedId(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [JSON.stringify(documentIds)])

  const selected = React.useMemo(() => documents.find(d => d.id === selectedId) || null, [documents, selectedId])

  if (loading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>Loading documents…</div>
    )
  }

  if (!documents.length) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>No documents attached</div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Attached Documents</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {documents.map(doc => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedId(doc.id)}
              className={`w-full text-left border rounded-lg p-3 transition-colors ${selectedId === doc.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <div className="text-sm font-medium text-gray-900 truncate">{doc.title || 'Untitled document'}</div>
              {doc.description ? (
                <div className="text-xs text-gray-600 line-clamp-2 mt-1">{doc.description}</div>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 mt-4">
        <div className="sticky top-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
          <FileViewer url={selected?.url || undefined} title={selected?.title || undefined} className="h-[calc(100vh-100px)]" />
        </div>
      </div>
    </div>
  )
}


