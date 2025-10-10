"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FileType, FILE_TYPE_NAMES } from "@/lib/types/eacertificate"
import { FileExtension } from "@/components/documents/FileViewer"

interface DocumentEditData {
  id: string
  file: File
  fileType: FileType
  fileExtension: FileExtension
  title: string
  description: string
  metadata: Array<{ key: string; label: string; value: string }>
  organizations: Array<{ orgId: string; role: string }>
}

interface DocumentEditModalProps {
  document: DocumentEditData | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (documentId: string, updates: Partial<DocumentEditData>) => void
}

export function DocumentEditModal({ 
  document, 
  isOpen, 
  onClose, 
  onUpdate 
}: DocumentEditModalProps) {
  const [formData, setFormData] = useState({
    title: document?.title || "",
    description: document?.description || "",
    fileType: document?.fileType || "other" as FileType
  })

  // Update form data when document changes
  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        description: document.description,
        fileType: document.fileType
      })
    }
  }, [document])

  const handleSave = () => {
    if (document) {
      onUpdate(document.id, formData)
      onClose()
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    if (document) {
      setFormData({
        title: document.title,
        description: document.description,
        fileType: document.fileType
      })
    }
    onClose()
  }

  if (!document) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Document Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Document title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Document description"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Type
            </label>
            <select
              value={formData.fileType}
              onChange={(e) => setFormData(prev => ({ ...prev, fileType: e.target.value as FileType }))}
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

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
