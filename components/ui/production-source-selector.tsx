"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { listProductionSources } from '@/lib/services/production-sources'
import ProductionSourceCollapsibleForm from '@/components/eacertificate/ProductionSourceCollapsibleForm'
import FileViewer from '@/components/documents/FileViewer'

export interface ProductionSourceSelectorProps {
  value: string
  onChange: (psId: string, psName?: string) => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  productionSources?: Array<{ id: string; name: string | null; technology?: string; location?: any; external_ids?: any[] | null }>
  onProductionSourcesChange?: (productionSources: Array<{ id: string; name: string | null; technology?: string; location?: any; external_ids?: any[] | null }>) => void
  sharedDocuments?: any[]
  selectedDocumentId?: string | null
  allowCreate?: boolean
  createButtonText?: string
  className?: string
}

export default function ProductionSourceSelector({
  value,
  onChange,
  placeholder = 'Select production source',
  disabled = false,
  isLoading: externalLoading,
  productionSources: externalProductionSources,
  onProductionSourcesChange,
  sharedDocuments = [],
  selectedDocumentId,
  allowCreate = true,
  createButtonText = "Can't find it? Create a new production source",
  className,
}: ProductionSourceSelectorProps) {
  const [open, setOpen] = useState(false)
  const [productionSources, setProductionSources] = useState<Array<{ id: string; name: string | null; technology?: string; location?: any; external_ids?: any[] | null }>>([])
  const [isLoadingPs, setIsLoadingPs] = useState(true)
  const [isCreatingPs, setIsCreatingPs] = useState(false)

  // Use external production sources if provided, otherwise load them
  useEffect(() => {
    if (externalProductionSources) {
      setProductionSources(externalProductionSources)
      setIsLoadingPs(false)
      return
    }

    const loadProductionSources = async () => {
      try {
        setIsLoadingPs(true)
        const sources = await listProductionSources()
        const transformedSources = sources.map((source: any) => ({
          id: source.id,
          name: source.name,
          technology: source.technology,
          location: source.location,
          external_ids: source.external_ids || null
        }))
        setProductionSources(transformedSources)
      } catch (error) {
        console.error('Failed to load production sources:', error)
      } finally {
        setIsLoadingPs(false)
      }
    }
    loadProductionSources()
  }, [externalProductionSources])

  // Update internal production sources when external list changes
  useEffect(() => {
    if (externalProductionSources) {
      setProductionSources(externalProductionSources)
    }
  }, [externalProductionSources])

  const isLoading = externalLoading !== undefined ? externalLoading : isLoadingPs

  // Find selected production source - check both internal state and external prop
  const selectedPs = React.useMemo(() => {
    const sourcesToSearch = externalProductionSources || productionSources
    return sourcesToSearch.find(ps => ps.id === value)
  }, [value, externalProductionSources, productionSources])

  // Format production source for display in dropdown
  const formatPsLabel = (ps: { id: string; name: string | null; technology?: string; location?: any; external_ids?: any[] | null }): string => {
    const name = ps.name || `Source ${ps.id.slice(0, 8)}...`
    const technology = ps.technology ? ` - ${ps.technology}` : ''
    const country = ps.location?.country ? ` - ${ps.location.country}` : ''
    const externalId = ps.external_ids && ps.external_ids.length > 0 && ps.external_ids[0]?.id
      ? ` - ${ps.external_ids[0].id}`
      : ''
    return `${name}${technology}${country}${externalId}`
  }

  const handleProductionSourceCreated = (productionSource: { id: string; name: string }) => {
    const newPs = { 
      id: productionSource.id, 
      name: productionSource.name, 
      technology: undefined,
      location: undefined,
      external_ids: null 
    }
    
    // Add to production sources list if not already present
    const updatedProductionSources = (() => {
      // Use the most current list - prefer external if provided, otherwise internal
      const current = externalProductionSources || productionSources
      const exists = current.some(ps => ps.id === productionSource.id)
      if (exists) return current
      return [...current, newPs]
    })()

    // Update internal state immediately
    setProductionSources(updatedProductionSources)
    
    // Notify parent if callback provided (this updates parent's production source list)
    // This must happen before onChange to ensure parent's list is updated
    if (onProductionSourcesChange) {
      onProductionSourcesChange(updatedProductionSources)
    }
    
    // Close the creation sheet
    setIsCreatingPs(false)
    
    // Pre-select the newly created production source immediately
    // The parent's list will be updated via onProductionSourcesChange callback
    onChange(productionSource.id, productionSource.name)
  }

  // Get the selected document for preview
  const selectedDocument = React.useMemo(() => {
    const docs = sharedDocuments
    return selectedDocumentId 
      ? docs.find(doc => doc.id === selectedDocumentId) || null
      : docs[0] || null
  }, [selectedDocumentId, sharedDocuments])

  return (
    <>
      <div className={cn("space-y-2", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled || isLoading}
            >
              {value && selectedPs
                ? formatPsLabel(selectedPs)
                : value
                ? `Production Source ${value}` // Fallback if ps not found in list yet
                : isLoading ? 'Loading production sources...' : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search production source..." className="h-9" />
              <CommandList>
                <CommandEmpty>No production source found.</CommandEmpty>
                <CommandGroup>
                  {productionSources.map((ps) => {
                    const isSelected = value === ps.id
                    const label = formatPsLabel(ps)
                    return (
                      <CommandItem
                        key={ps.id}
                        value={label}
                        onSelect={() => {
                          onChange(ps.id, ps.name || undefined)
                          setOpen(false)
                        }}
                      >
                        {label}
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {allowCreate && (
          <div className="text-xs">
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700"
              onClick={(e) => {
                e.preventDefault()
                setIsCreatingPs(true)
              }}
              disabled={disabled}
            >
              {createButtonText}
            </button>
          </div>
        )}
      </div>

      {/* Create Production Source Sheet */}
      {allowCreate && (
        <Sheet open={isCreatingPs} onOpenChange={(open) => {
          setIsCreatingPs(open)
        }}>
          <SheetContent side="right" className="w-[90vw] max-w-[90vw]">
            <div className="flex h-full">
              {/* Document Preview Section */}
              {sharedDocuments && sharedDocuments.length > 0 && (
                <div className="w-1/2 border-r border-gray-200 p-4">
                  <div className="h-full flex flex-col">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preview</h2>
                    <div className="flex-1 min-h-0">
                      <FileViewer
                        file={selectedDocument?.file}
                        fileType={selectedDocument?.fileType}
                        fileExtension={selectedDocument?.fileExtension}
                        title={selectedDocument?.title}
                        className="h-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Section */}
              <div className={sharedDocuments && sharedDocuments.length > 0 ? "w-1/2 flex flex-col" : "w-full flex flex-col"}>
                <SheetHeader className="p-4 pb-0">
                  <SheetTitle>Create Production Source</SheetTitle>
                  <SheetDescription>
                    {sharedDocuments && sharedDocuments.length > 0 ? "We'll reuse the documents you uploaded for this certificate." : "Create a new production source."}
                  </SheetDescription>
                </SheetHeader>
                <div className="p-4 pt-0 flex-1 overflow-y-auto">
                  <ProductionSourceCollapsibleForm
                    onProductionSourceCreated={handleProductionSourceCreated}
                    sharedDocuments={sharedDocuments}
                    defaultExpanded
                    hideHeader
                    plain
                  />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}

