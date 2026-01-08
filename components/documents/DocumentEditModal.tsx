"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileType, FILE_TYPE_NAMES, MetadataItem, OrganizationRole } from "@/lib/types/eacertificate"
import { FileExtension } from "@/components/documents/FileViewer"
import MetadataField from "@/components/ui/metadata-field"

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
    fileType: document?.fileType || "other" as FileType,
    metadata: document?.metadata || []
  })

  // Update form data when document changes
  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        description: document.description,
        fileType: document.fileType,
        metadata: document.metadata
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
        fileType: document.fileType,
        metadata: document.metadata
      })
    }
    onClose()
  }

  if (!document) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
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
            <Select
              value={formData.fileType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, fileType: value as FileType }))}
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

          <MetadataField
            value={formData.metadata}
            onChange={(value) => setFormData(prev => ({ ...prev, metadata: value }))}
            label="Metadata"
            description="Add custom metadata fields for this document"
          />
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
