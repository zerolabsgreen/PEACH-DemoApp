"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import LocationField from '@/components/ui/location-field'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import type { Location, ExternalID } from '@/lib/types/eacertificate'

interface OrganizationPreviewProps {
  organization: {
    id: string
    name: string
    url: string | null
    description: string | null
    contact: string | null
    location: Location[] | null
    external_ids: ExternalID[] | null
  }
}

export default function OrganizationPreview({ organization }: OrganizationPreviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <Input 
          value={organization.name} 
          disabled 
          className="bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
        <Input 
          value={organization.url || ''} 
          disabled 
          className="bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <Textarea 
          value={organization.description || ''} 
          disabled 
          rows={3}
          className="bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
        <Input 
          value={organization.contact || ''} 
          disabled 
          className="bg-gray-50"
        />
      </div>

      {organization.location && organization.location.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <div className="space-y-2">
            {organization.location.map((loc, index) => (
              <div key={index} className="border rounded p-3 bg-gray-50">
                <LocationField 
                  value={loc} 
                  onChange={() => {}} 
                  disabled
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <ExternalIdField
        value={organization.external_ids || []}
        onChange={() => {}}
        label="External identifiers"
        description="External identifiers for this organization"
        disabled
      />
    </div>
  )
}
