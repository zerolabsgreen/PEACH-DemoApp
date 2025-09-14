"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileType } from '@/lib/types/eacertificate'

export type FileExtension = 'PDF' | 'CSV'

export interface FileViewerProps {
  file?: File | null
  url?: string
  fileType?: FileType
  fileExtension?: FileExtension
  title?: string
  className?: string
}

export default function FileViewer({ file, url, fileType, fileExtension, title, className = "" }: FileViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [csvData, setCsvData] = useState<string[][]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  // Handle file changes
  useEffect(() => {
    if (file) {
      setIsLoading(true)
      setError(null)
      
      // Create object URL for the file
      const newObjectUrl = URL.createObjectURL(file)
      setObjectUrl(newObjectUrl)

      // Handle CSV files
      if (fileExtension === 'CSV' || file.name.toLowerCase().endsWith('.csv')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string
            const lines = text.split('\n').filter(line => line.trim())
            const data = lines.map(line => line.split(',').map(cell => cell.trim()))
            setCsvData(data)
            setIsLoading(false)
          } catch (err) {
            setError('Failed to parse CSV file')
            setIsLoading(false)
          }
        }
        reader.onerror = () => {
          setError('Failed to read CSV file')
          setIsLoading(false)
        }
        reader.readAsText(file)
      } else {
        setIsLoading(false)
      }
    } else if (url) {
      setObjectUrl(url)
      setIsLoading(false)
    } else {
      setObjectUrl(null)
      setCsvData([])
      setIsLoading(false)
      setError(null)
    }
  }, [file, url, fileExtension])

  const renderCSVTable = () => {
    if (csvData.length === 0) return null

    return (
      <div className="w-full h-full overflow-auto bg-white">
        <table 
          className="min-w-full border-collapse border border-gray-300"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoom / 100)}%`
          }}
        >
          <thead>
            <tr className="bg-gray-50">
              {csvData[0]?.map((header, index) => (
                <th key={index} className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {csvData.slice(1).map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderPDFViewer = () => {
    if (!objectUrl) return null

    return (
      <div className="w-full h-full overflow-auto bg-gray-100">
        <iframe
          src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
          className="w-full h-full border-0"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoom / 100)}%`,
            height: `${100 / (zoom / 100)}%`
          }}
          title={title || 'PDF Document'}
        />
      </div>
    )
  }

  if (!file && !url) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No file selected</p>
          <p className="text-xs text-gray-400">Upload a PDF or CSV file to view it here</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading file...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col ${className}`}>
      {/* Header with title and zoom controls */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {title || (file ? file.name : 'Document Preview')}
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="h-6 px-2 text-xs"
          >
            -
          </Button>
          <span className="text-xs text-gray-600 min-w-[3rem] text-center">
            {zoom}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="h-6 px-2 text-xs"
          >
            +
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(100)}
            className="h-6 px-2 text-xs"
          >
            Reset
          </Button>
        </div>
      </div>
      
      {/* File content area */}
      <div className="flex-1 overflow-hidden">
        {fileExtension === 'CSV' || (file && file.name.toLowerCase().endsWith('.csv')) ? (
          renderCSVTable()
        ) : (
          renderPDFViewer()
        )}
      </div>
    </div>
  )
}
