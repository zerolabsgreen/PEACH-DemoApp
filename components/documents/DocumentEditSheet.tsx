"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileType, FILE_TYPE_NAMES } from "@/lib/types/eacertificate"
import { FileExtension } from "@/components/documents/FileViewer"
import FileViewer from "@/components/documents/FileViewer"

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

interface DocumentEditSheetProps {
  document: DocumentEditData | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (documentId: string, updates: Partial<DocumentEditData>) => void
}

export function DocumentEditSheet({ 
  document, 
  isOpen, 
  onClose, 
  onUpdate 
}: DocumentEditSheetProps) {
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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="!w-[70vw] !max-w-[70vw]">
        <div className="flex h-full">
          {/* Left Side - Form */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <SheetHeader className="p-4 pb-0">
              <SheetTitle>Edit Document Details</SheetTitle>
              <SheetDescription>
                Update the document information and metadata.
              </SheetDescription>
            </SheetHeader>
            
            <div className="p-4 pt-0 flex-1 overflow-y-auto">
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
              </div>
            </div>

            {/* Form Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side - Document Preview */}
          <div className="w-2/3 p-4">
            <div className="h-full flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
              <div className="flex-1 min-h-0">
                <FileViewer
                  file={document.file}
                  fileType={document.fileType}
                  fileExtension={document.fileExtension}
                  title={document.title}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
