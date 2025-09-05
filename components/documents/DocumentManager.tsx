"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DocumentUploader, { type DocumentFormItem } from '@/components/documents/DocumentUploader'
import { getDocumentsByIds, deleteDocument, uploadAndCreateDocument, DocumentRecord } from '@/lib/services/documents'
import { FileType } from '@/lib/types/eacertificate'
import { createClientComponentClient } from '@/lib/supabase'
import { toast } from 'sonner'

export interface DocumentManagerProps {
  entityType: 'organizations' | 'eacertificates' | 'production-sources' | 'events'
  entityId: string
  currentDocumentIds: string[]
  onDocumentsChange: (newDocumentIds: string[]) => void
  trigger?: React.ReactNode
}

export default function DocumentManager({ 
  entityType, 
  entityId, 
  currentDocumentIds, 
  onDocumentsChange,
  trigger 
}: DocumentManagerProps) {
  const [open, setOpen] = useState(false)
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newDocuments, setNewDocuments] = useState<DocumentFormItem[]>([])
  const [uploaderKey, setUploaderKey] = useState(0)

  const supabase = createClientComponentClient()

  // Load existing documents when dialog opens
  useEffect(() => {
    if (open) {
      if (currentDocumentIds.length > 0) {
        loadDocuments()
      } else {
        setDocuments([])
      }
      // Reset upload form when dialog opens
      setNewDocuments([])
      setUploaderKey(prev => prev + 1)
    }
  }, [open])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      const docs = await getDocumentsByIds(currentDocumentIds)
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await deleteDocument(documentId)
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      
      // Update entity's document array
      const newDocumentIds = currentDocumentIds.filter(id => id !== documentId)
      onDocumentsChange(newDocumentIds)
      
      // Update the entity in the database
      await updateEntityDocuments(newDocumentIds)
      
      toast.success('Document deleted successfully')
    } catch (error) {
      console.error('Failed to delete document:', error)
      toast.error('Failed to delete document. Please try again.')
    }
  }

  const handleUploadDocuments = async () => {
    if (newDocuments.length === 0) return

    setUploading(true)
    try {
      const uploadedIds: string[] = []
      const uploadedCount = newDocuments.filter(item => item.file).length
      
      // Upload each new document
      for (const item of newDocuments) {
        if (!item.file) continue
        
        const doc = await uploadAndCreateDocument({
          file: item.file,
          fileName: item.file.name,
          fileType: item.fileType as FileType,
          title: item.title,
          description: item.description,
          metadata: item.metadata,
          organizations: item.organizations || [],
        })
        
        uploadedIds.push(doc.id)
      }

      // Update entity's document array
      const newDocumentIds = [...currentDocumentIds, ...uploadedIds]
      
      // Update the entity in the database first
      await updateEntityDocuments(newDocumentIds)
      
      // Update parent component state
      onDocumentsChange(newDocumentIds)
      
      // Reload documents using the new IDs
      const docs = await getDocumentsByIds(newDocumentIds)
      setDocuments(docs)
      
      // Clear new documents form and reset uploader
      setNewDocuments([])
      setUploaderKey(prev => prev + 1) // Force re-render of DocumentUploader
      
      // Show success notification
      toast.success(`Successfully uploaded ${uploadedCount} document${uploadedCount > 1 ? 's' : ''}`)
      
    } catch (error) {
      console.error('Failed to upload documents:', error)
      toast.error('Failed to upload documents. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const updateEntityDocuments = async (documentIds: string[]) => {
    const { error } = await supabase
      .from(entityType)
      .update({ documents: documentIds })
      .eq('id', entityId)

    if (error) throw error
  }

  const formatFileType = (fileType: string) => {
    return fileType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Manage Documents
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Manage Documents</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8 py-4">
          {/* Existing Documents Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Current Documents</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading documents...</p>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No documents uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload your first document below</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700 w-[30%]">Title</TableHead>
                      <TableHead className="font-semibold text-gray-700 w-[15%]">Type</TableHead>
                      <TableHead className="font-semibold text-gray-700 w-[35%]">Description</TableHead>
                      <TableHead className="font-semibold text-gray-700 w-[15%]">Uploaded</TableHead>
                      <TableHead className="font-semibold text-gray-700 w-[5%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc, index) => (
                      <TableRow key={doc.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="font-medium">
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 break-words"
                          >
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="break-words">{doc.title || 'Untitled'}</span>
                          </a>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {formatFileType(doc.file_type)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="text-gray-600 break-words">
                            {doc.description || '-'}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(doc.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="h-8 px-3 text-xs"
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Upload New Documents */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Upload New Documents</h3>
              {newDocuments.length > 0 && (
                <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  {newDocuments.length} file{newDocuments.length !== 1 ? 's' : ''} ready
                </span>
              )}
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <DocumentUploader
                key={uploaderKey}
                defaultItems={[]}
                onChange={setNewDocuments}
              />
            </div>
            
            {newDocuments.length > 0 && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewDocuments([])
                    setUploaderKey(prev => prev + 1)
                  }}
                  className="px-6"
                >
                  Clear All
                </Button>
                <Button
                  onClick={handleUploadDocuments}
                  disabled={uploading}
                  className="px-6 bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </div>
                  ) : (
                    `Upload ${newDocuments.length} Document${newDocuments.length > 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Dialog Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="px-6"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
