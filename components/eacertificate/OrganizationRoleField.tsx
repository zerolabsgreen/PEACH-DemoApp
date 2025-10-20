"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrganizationRole } from '@/lib/types/eacertificate'
import { Plus, Trash2, Eye } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { listOrganizationsWithRole, getOrganization } from '@/lib/services/organizations'
import { formatOrganizationLabel } from '@/lib/utils/production-source-utils'
import { toast } from 'sonner'
import OrganizationCollapsibleForm from './OrganizationCollapsibleForm'
import OrganizationPreview from './OrganizationPreview'
import FileViewer from '@/components/documents/FileViewer'

export interface OrganizationRoleFieldProps {
  value: OrganizationRole[]
  onChange: (value: OrganizationRole[]) => void
  label?: React.ReactNode
  description?: string
  onCreateOrganization?: (orgId: string, orgName: string) => void
  sharedDocuments?: any[]
  selectedDocumentId?: string | null
}

export default function OrganizationRoleField({ 
  value = [], 
  onChange, 
  label = "Organizations",
  description,
  onCreateOrganization,
  sharedDocuments = [],
  selectedDocumentId
}: OrganizationRoleFieldProps) {
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string | null; external_ids?: any[] | null }>>([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true)
  const [creatingForIndex, setCreatingForIndex] = useState<number | null>(null)
  const [selectKey, setSelectKey] = useState(0)
  const [previewOrgId, setPreviewOrgId] = useState<string | null>(null)
  const [previewOrg, setPreviewOrg] = useState<any>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Get the selected document for preview
  const selectedDocument = React.useMemo(() => {
    const docs = sharedDocuments
    return selectedDocumentId 
      ? docs.find(doc => doc.id === selectedDocumentId) || null
      : docs[0] || null
  }, [selectedDocumentId, sharedDocuments])

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setIsLoadingOrgs(true)
        const orgs = await listOrganizationsWithRole()
        // Transform the data to match our expected format
        const transformedOrgs = orgs.map((item: any) => ({
          id: item.organizations.id,
          name: item.organizations.name,
          external_ids: item.organizations.external_ids
        }))
        setOrganizations(transformedOrgs)
      } catch (error) {
        console.error('Failed to load organizations:', error)
        toast.error('Failed to load organizations. Please try again.')
      } finally {
        setIsLoadingOrgs(false)
      }
    }
    loadOrganizations()
  }, [])

  const handleAddRole = () => {
    const newOrganizationRole: OrganizationRole = {
      orgId: '',
      role: '',
      orgName: undefined
    }

    onChange([...value, newOrganizationRole])
  }

  const handleRemoveRole = (index: number) => {
    const updatedRoles = value.filter((_, i) => i !== index)
    onChange(updatedRoles)
  }

  const handleOrganizationCreated = (organization: { id: string; name: string }) => {
    // Add to organizations list
    setOrganizations(prev => {
      const exists = prev.some(org => org.id === organization.id)
      return exists ? prev : [...prev, { id: organization.id, name: organization.name }]
    })
    
    // Populate the specific organization role that triggered the creation
    if (creatingForIndex !== null) {
      const updatedRoles = [...value]
      updatedRoles[creatingForIndex] = {
        ...updatedRoles[creatingForIndex],
        orgId: organization.id,
        orgName: organization.name
      }
      onChange(updatedRoles)
      
      // Force Select component to re-render
      setSelectKey(prev => prev + 1)
    }
    
    // Notify parent component
    onCreateOrganization?.(organization.id, organization.name)
    
    setIsCreatingOrg(false)
    setCreatingForIndex(null)
  }

  const handlePreviewOrganization = async (orgId: string) => {
    if (previewOrgId === orgId) {
      setPreviewOrgId(null)
      setPreviewOrg(null)
      return
    }

    setIsLoadingPreview(true)
    try {
      const org = await getOrganization(orgId)
      setPreviewOrg(org)
      setPreviewOrgId(orgId)
    } catch (error) {
      console.error('Failed to load organization:', error)
      toast.error('Failed to load organization details')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">
            {label}
          </div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRole}>
          Add role
        </Button>
      </div>

      <div className="space-y-4">
        {value.map((orgRole, index) => (
          <div key={index} className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Organization {index + 1}</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveRole(index)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                Remove
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-gray-500">Organization</label>
                  {orgRole.orgId && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      onClick={() => handlePreviewOrganization(orgRole.orgId)}
                      disabled={isLoadingPreview}
                    >
                      <Eye className="h-3 w-3" />
                      {isLoadingPreview ? 'Loading...' : 'Preview'}
                    </button>
                  )}
                </div>
                <Select
                  key={`org-select-${index}-${orgRole.orgId}-${selectKey}`}
                  value={orgRole.orgId || ''}
                  onValueChange={(selectedValue) => {
                    const selectedOrg = organizations.find(org => org.id === selectedValue)
                    const updatedRoles = [...value]
                    updatedRoles[index] = {
                      ...orgRole,
                      orgId: selectedValue,
                      orgName: selectedOrg?.name || undefined
                    }
                    onChange(updatedRoles)
                  }}
                  disabled={isLoadingOrgs}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isLoadingOrgs ? 'Loading organizations...' : 'Select an organization'} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {formatOrganizationLabel(org)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs mt-2">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={(e) => {
                      e.preventDefault()
                      setCreatingForIndex(index)
                      setIsCreatingOrg(true)
                    }}
                  >
                    Can't find it? Create a new organization
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Role</label>
                <Input
                  value={orgRole.role}
                  onChange={(e) => {
                    const updatedRoles = [...value]
                    updatedRoles[index] = { ...orgRole, role: e.target.value }
                    onChange(updatedRoles)
                  }}
                  placeholder="e.g. Issuer, Verifier, Buyer, etc."
                />
              </div>
            </div>
          </div>
        ))}
        
        {value.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded-md">
            <div className="mb-2">No organizations added yet.</div>
            <div className="text-xs text-gray-400">Organizations are optional for this certificate.</div>
            <div className="mt-2">Click "Add role" to get started.</div>
          </div>
        )}
      </div>

      {/* Create Organization Sheet */}
      <Sheet open={isCreatingOrg} onOpenChange={(open) => {
        setIsCreatingOrg(open)
        if (!open) {
          setCreatingForIndex(null)
        }
      }}>
        <SheetContent side="right" className="w-[90vw] max-w-[90vw]">
          <div className="flex h-full">
            {/* Document Preview Section */}
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

            {/* Form Section */}
            <div className="w-1/2 flex flex-col">
              <SheetHeader className="p-4 pb-0">
                <SheetTitle>Create Organization</SheetTitle>
                <SheetDescription>
                  We'll reuse the documents you uploaded for this certificate.
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

      {/* Organization Preview Sheet */}
      <Sheet open={previewOrgId !== null} onOpenChange={(open) => {
        if (!open) {
          setPreviewOrgId(null)
          setPreviewOrg(null)
        }
      }}>
        <SheetContent side="right" className="w-[60vw] max-w-[60vw]">
          <SheetHeader>
            <SheetTitle>Organization Preview</SheetTitle>
            <SheetDescription>
              View organization details (read-only)
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 pt-0 flex-1 overflow-y-auto">
            {previewOrg ? (
              <OrganizationPreview organization={previewOrg} />
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-gray-500">Loading organization details...</div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
