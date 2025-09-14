"use client"

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { FileType } from '@/lib/types/eacertificate'

export interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void
  maxFiles?: number
  acceptedFileTypes?: string[]
  className?: string
}

export default function Dropzone({ 
  onFilesAccepted, 
  maxFiles = 10, 
  acceptedFileTypes = ['.pdf', '.csv'],
  className = ""
}: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter files to only include PDF and CSV
    const validFiles = acceptedFiles.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      return extension === 'pdf' || extension === 'csv'
    })

    if (validFiles.length > 0) {
      onFilesAccepted(validFiles)
    }
  }, [onFilesAccepted])

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    maxFiles,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg cursor-pointer transition-colors flex items-center justify-center
        ${isDragActive && !isDragReject 
          ? 'border-blue-400 bg-blue-50' 
          : isDragReject 
          ? 'border-red-400 bg-red-50' 
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }
        ${className}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="text-center space-y-4 p-8">
        <div className="mx-auto w-12 h-12 text-gray-400">
          {isDragActive ? (
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          ) : (
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          )}
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isDragActive 
              ? 'Drop files here' 
              : 'Drag & drop files here'
            }
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to select files
          </p>
        </div>
        
        <div className="text-xs text-gray-400">
          <p>Supported formats: PDF, CSV</p>
          <p>Maximum {maxFiles} file{maxFiles > 1 ? 's' : ''}</p>
        </div>
        
        {isDragReject && (
          <p className="text-sm text-red-600 font-medium">
            Only PDF and CSV files are allowed
          </p>
        )}
      </div>
    </div>
  )
}
