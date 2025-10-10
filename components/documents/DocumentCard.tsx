"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { FileType } from '@/lib/types/eacertificate'

export type FileExtension = 'PDF' | 'CSV'

export interface DocumentCardProps {
  file: File
  fileType: FileType
  fileExtension: FileExtension
  title: string
  description?: string
  isSelected?: boolean
  onSelect: () => void
  onRemove: () => void
  onEdit?: () => void
  className?: string
}

export default function DocumentCard({ 
  file, 
  fileType, 
  fileExtension,
  title, 
  description, 
  isSelected = false,
  onSelect, 
  onRemove,
  className = "",
  onEdit
}: DocumentCardProps) {
  const getFileIcon = (fileExtension: FileExtension) => {
    if (fileExtension === 'PDF') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      )
    } else if (fileExtension === 'CSV') {
      return (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div
      className={`
        border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300'
        }
        ${className}
      `}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getFileIcon(fileExtension)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {title || file.name}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 h-6 w-6"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          
          <div className="mt-1 space-y-1">
            <p className="text-xs text-gray-500">
              {fileExtension} • {formatFileSize(file.size)}
            </p>
            {description && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          
          {isSelected && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="flex items-center text-blue-600">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Currently viewing
              </div>
              {onEdit && (
                <button
                  type="button"
                  className="text-gray-600 hover:text-gray-900 underline underline-offset-2"
                  onClick={(e) => { e.stopPropagation(); onEdit() }}
                >
                  Edit info
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
