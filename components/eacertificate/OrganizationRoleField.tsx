"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OrganizationRole } from '@/lib/types/eacertificate'
import { Plus, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { createOrganizationFull, listOrganizationsWithRole } from '@/lib/services/organizations'
import { toast } from 'sonner'

export interface OrganizationRoleFieldProps {
  value: OrganizationRole[]
  onChange: (value: OrganizationRole[]) => void
  label?: React.ReactNode
  description?: string
  onCreateOrganization?: (orgId: string, orgName: string) => void
}

export default function OrganizationRoleField({ 
  value = [], 
  onChange, 
  label = "Organizations",
  description,
  onCreateOrganization 
}: OrganizationRoleFieldProps) {
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string | null }>>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [role, setRole] = useState('')
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true)

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setIsLoadingOrgs(true)
        const orgs = await listOrganizationsWithRole()
        // Transform the data to match our expected format
        const transformedOrgs = orgs.map((item: any) => ({
          id: item.organizations.id,
          name: item.organizations.name
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
    if (!role.trim() || !selectedOrgId.trim()) return

    const selectedOrg = organizations.find(org => org.id === selectedOrgId)
    const newOrganizationRole: OrganizationRole = {
      orgId: selectedOrgId.trim(),
      role: role.trim(),
      orgName: selectedOrg?.name || undefined
    }

    onChange([...value, newOrganizationRole])
    setRole('')
    setSelectedOrgId('')
  }

  const handleRemoveRole = (index: number) => {
    const updatedRoles = value.filter((_, i) => i !== index)
    onChange(updatedRoles)
  }

  const handleCreateOrganization = async (name: string, description?: string) => {
    try {
      const newOrg = await createOrganizationFull({
        name,
        description: description || '',
        externalIDs: [],
        location: {},
        organizations: [],
        links: [],
        documents: [],
        metadata: []
      })
      
      // Add to organizations list
      setOrganizations(prev => [...prev, { id: newOrg.id, name: newOrg.name }])
      
      // Set the new organization as selected
      setSelectedOrgId(newOrg.id)
      
      // Notify parent component
      onCreateOrganization?.(newOrg.id, newOrg.name || '')
      
      toast.success('Organization created successfully')
      setIsCreatingOrg(false)
    } catch (error) {
      console.error('Failed to create organization:', error)
      toast.error('Failed to create organization')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-gray-700">{label}</Label>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>

      {/* Existing Organizations */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((orgRole, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {orgRole.orgName || `Organization ${orgRole.orgId.slice(0, 8)}...`}
                </div>
                <div className="text-sm text-gray-600">
                  Role: {orgRole.role}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveRole(index)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Organization Role */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="organization" className="text-sm font-medium text-gray-700">
                Organization *
              </Label>
              <select
                id="organization"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                disabled={isLoadingOrgs}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingOrgs ? 'Loading organizations...' : 'Select an organization'}
                </option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name || `Organization ${org.id.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                Role *
              </Label>
              <Input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Issuer, Verifier, Buyer, etc."
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleAddRole}
              disabled={!role.trim() || !selectedOrgId.trim() || isLoadingOrgs}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Role
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreatingOrg(true)}
              size="sm"
            >
              Create New Organization
            </Button>
          </div>
        </div>
      </div>

      {/* Create Organization Sidebar */}
      <CreateOrganizationSidebar
        isOpen={isCreatingOrg}
        onClose={() => setIsCreatingOrg(false)}
        onCreate={handleCreateOrganization}
      />
    </div>
  )
}

// Create Organization Sidebar Component
interface CreateOrganizationSidebarProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description?: string) => void
}

function CreateOrganizationSidebar({ isOpen, onClose, onCreate }: CreateOrganizationSidebarProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onCreate(name.trim(), description.trim() || undefined)
      setName('')
      setDescription('')
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create New Organization</SheetTitle>
          <SheetDescription>
            Create a new organization that can be assigned roles in certificates.
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <Label htmlFor="org-name" className="text-sm font-medium text-gray-700">
              Organization Name *
            </Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organization name"
              required
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="org-description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <textarea
              id="org-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter organization description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
