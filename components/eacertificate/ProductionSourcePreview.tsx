"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import LocationField from '@/components/ui/location-field'
import LinksField from '@/components/ui/links-field'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import MetadataField from '@/components/ui/metadata-field'
import type { Location, ExternalID, MetadataItem } from '@/lib/types/eacertificate'

interface ProductionSourcePreviewProps {
  productionSource: {
    id: string
    name: string | null
    description: string | null
    location: Location
    links: string[] | null
    technology: string
    external_ids: ExternalID[] | null
    related_production_sources: string[] | null
    metadata: MetadataItem[] | null
  }
}

export default function ProductionSourcePreview({ productionSource }: ProductionSourcePreviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <Input 
          value={productionSource.name || ''} 
          disabled 
          className="bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <Textarea 
          value={productionSource.description || ''} 
          disabled 
          rows={3}
          className="bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Technology</label>
        <Input 
          value={productionSource.technology} 
          disabled 
          className="bg-gray-50"
        />
      </div>

      <LocationField 
        value={productionSource.location || { country: '', subdivision: '', region: '', address: '', zipCode: '' }} 
        onChange={() => {}} 
        disabled
      />

      <LinksField 
        value={productionSource.links || []} 
        onChange={() => {}} 
        disabled
      />

      <ExternalIdField
        value={productionSource.external_ids || []}
        onChange={() => {}}
        label="External identifiers"
        description="External identifiers for this production source"
        disabled
      />

      <MetadataField
        value={productionSource.metadata || []}
        onChange={() => {}}
        label="Metadata"
        description="Custom metadata fields for this production source"
        disabled
      />
    </div>
  )
}
