"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { listOrganizationsWithRole } from '@/lib/services/organizations'
import { formatOrganizationLabel } from '@/lib/utils/production-source-utils'
import OrganizationCollapsibleForm from '@/components/eacertificate/OrganizationCollapsibleForm'
import FileViewer from '@/components/documents/FileViewer'

export interface OrganizationSelectorProps {
  value: string
  onChange: (orgId: string, orgName?: string) => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  organizations?: Array<{ id: string; name: string | null; external_ids?: any[] | null; mainRole?: string | null }>
  onOrganizationsChange?: (organizations: Array<{ id: string; name: string | null; external_ids?: any[] | null; mainRole?: string | null }>) => void
  sharedDocuments?: any[]
  selectedDocumentId?: string | null
  allowCreate?: boolean
  createButtonText?: string
  className?: string
}

export default function OrganizationSelector({
  value,
  onChange,
  placeholder = 'Select organization',
  disabled = false,
  isLoading: externalLoading,
  organizations: externalOrganizations,
  onOrganizationsChange,
  sharedDocuments = [],
  selectedDocumentId,
  allowCreate = true,
  createButtonText = "Can't find it? Create a new organization",
  className,
}: OrganizationSelectorProps) {
  const [open, setOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string | null; external_ids?: any[] | null; mainRole?: string | null }>>([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  // Use external organizations if provided, otherwise load them
  useEffect(() => {
    if (externalOrganizations) {
      setOrganizations(externalOrganizations)
      setIsLoadingOrgs(false)
      return
    }

    const loadOrganizations = async () => {
      try {
        setIsLoadingOrgs(true)
        const orgs = await listOrganizationsWithRole()
        const transformedOrgs = orgs.map((item: any) => ({
          id: item.organizations.id,
          name: item.organizations.name,
          external_ids: item.organizations.external_ids,
          mainRole: item.organizations.mainRole || null
        }))
        setOrganizations(transformedOrgs)
      } catch (error) {
        console.error('Failed to load organizations:', error)
      } finally {
        setIsLoadingOrgs(false)
      }
    }
    loadOrganizations()
  }, [externalOrganizations])

  // Update internal organizations when external list changes
  useEffect(() => {
    if (externalOrganizations) {
      setOrganizations(externalOrganizations)
    }
  }, [externalOrganizations])

  const isLoading = externalLoading !== undefined ? externalLoading : isLoadingOrgs

  // Find selected org - check both internal state and external prop
  const selectedOrg = React.useMemo(() => {
    const orgsToSearch = externalOrganizations || organizations
    return orgsToSearch.find(org => org.id === value)
  }, [value, externalOrganizations, organizations])

  const handleOrganizationCreated = (organization: { id: string; name: string }) => {
    const newOrg = { id: organization.id, name: organization.name, external_ids: null }
    
    // Add to organizations list if not already present
    const updatedOrganizations = (() => {
      // Use the most current list - prefer external if provided, otherwise internal
      const current = externalOrganizations || organizations
      const exists = current.some(org => org.id === organization.id)
      if (exists) return current
      return [...current, newOrg]
    })()

    // Update internal state immediately
    setOrganizations(updatedOrganizations)
    
    // Notify parent if callback provided (this updates parent's organization list)
    // This must happen before onChange to ensure parent's list is updated
    if (onOrganizationsChange) {
      onOrganizationsChange(updatedOrganizations)
    }
    
    // Close the creation sheet
    setIsCreatingOrg(false)
    
    // Pre-select the newly created organization immediately
    // The parent's list will be updated via onOrganizationsChange callback
    onChange(organization.id, organization.name)
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
              {value && selectedOrg
                ? formatOrganizationLabel(selectedOrg)
                : value
                ? `Organization ${value}` // Fallback if org not found in list yet
                : isLoading ? 'Loading organizations...' : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search organization..." className="h-9" />
              <CommandList>
                <CommandEmpty>No organization found.</CommandEmpty>
                <CommandGroup>
                  {organizations.map((org) => {
                    const isSelected = value === org.id
                    return (
                      <CommandItem
                        key={org.id}
                        value={formatOrganizationLabel(org)}
                        onSelect={() => {
                          onChange(org.id, org.name || undefined)
                          setOpen(false)
                        }}
                      >
                        {formatOrganizationLabel(org)}
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
                setIsCreatingOrg(true)
              }}
              disabled={disabled}
            >
              {createButtonText}
            </button>
          </div>
        )}
      </div>

      {/* Create Organization Sheet */}
      {allowCreate && (
        <Sheet open={isCreatingOrg} onOpenChange={(open) => {
          setIsCreatingOrg(open)
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
                  <SheetTitle>Create Organization</SheetTitle>
                  <SheetDescription>
                    {sharedDocuments && sharedDocuments.length > 0 ? "We'll reuse the documents you uploaded for this certificate." : "Create a new organization."}
                  </SheetDescription>
                </SheetHeader>
                <div className="p-4 pt-0 flex-1 overflow-y-auto">
                  <OrganizationCollapsibleForm
                    onOrganizationCreated={handleOrganizationCreated}
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

