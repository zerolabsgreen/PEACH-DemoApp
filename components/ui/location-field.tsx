"use client"

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import OptionalFieldsManager, { type OptionalField } from '@/components/ui/optional-fields-manager'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'
import type { Location } from '@/lib/types/eacertificate'

let countryNames: string[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { countries } = require('countries-list') as any
  countryNames = Object.values(countries).map((c: any) => c.name).sort()
} catch (_) {
  countryNames = []
}

// Define optional fields configuration
const OPTIONAL_FIELDS: OptionalField[] = [
  {
    key: 'subdivision',
    label: 'State/Province',
    description: 'ISO 3166-2 subdivision (state/province)',
  },
  {
    key: 'region',
    label: 'Region',
    description: 'Market/grid/admin region',
  },
  {
    key: 'zipCode',
    label: 'ZIP Code',
    description: 'Postal or ZIP code',
  },
  {
    key: 'address',
    label: 'Address',
    description: 'Street address, city',
  },
  {
    key: 'latitude',
    label: 'Latitude',
    description: 'Geographic latitude coordinate',
  },
  {
    key: 'longitude',
    label: 'Longitude',
    description: 'Geographic longitude coordinate',
  },
  {
    key: 'geoBounds',
    label: 'Geospatial Bounds',
    description: 'Geospatial data file (Shapefile, KML, GeoJSON)',
  },
]

export interface LocationFieldProps {
  value: Location
  onChange: (value: Location) => void
  label?: string
  required?: boolean
  disabled?: boolean
}

// Helper function to determine which optional fields should be visible based on location value
const getVisibleFieldsFromValue = (location: Location): string[] => {
  const fields: string[] = []
  if (location.subdivision) fields.push('subdivision')
  if (location.region) fields.push('region')
  if (location.zipCode) fields.push('zipCode')
  if (location.address) fields.push('address')
  if (location.latitude !== undefined && location.latitude !== null) fields.push('latitude')
  if (location.longitude !== undefined && location.longitude !== null) fields.push('longitude')
  if (location.geoBounds) fields.push('geoBounds')
  return fields
}

export default function LocationField({
  value,
  onChange,
  label = 'Location',
  required = false,
  disabled = false,
}: LocationFieldProps) {
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<string[]>(() =>
    getVisibleFieldsFromValue(value)
  )

  // Update visible optional fields when value prop changes (for edit mode loading)
  useEffect(() => {
    const fieldsFromValue = getVisibleFieldsFromValue(value)
    if (fieldsFromValue.length > 0) {
      setVisibleOptionalFields(prev => {
        // Merge existing visible fields with fields that have values
        const merged = new Set([...prev, ...fieldsFromValue])
        return Array.from(merged)
      })
    }
  }, [value])

  const updateLocation = (field: keyof Location, newValue: string | number | undefined) => {
    onChange({ ...value, [field]: newValue })
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
        <OptionalFieldsManager
          fields={OPTIONAL_FIELDS}
          visibleFields={visibleOptionalFields}
          onFieldsChange={setVisibleOptionalFields}
          disabled={disabled}
          buttonText="Optional fields"
        />
      </div>
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6">
          <FormFieldWrapper label="Country" required={required}>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between" disabled={disabled}>
                  {value.country || 'Select a country'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 popover-content-width-full">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {countryNames.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={() => updateLocation('country', name)}
                        >
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <input 
              className="sr-only" 
              tabIndex={-1} 
              value={value.country || ''} 
              onChange={() => {}} 
              required={required} 
              aria-hidden="true" 
            />
          </FormFieldWrapper>
        </div>
        
        {visibleOptionalFields.includes('subdivision') && (
          <div className="col-span-12 md:col-span-6">
            <FormFieldWrapper label="State/Province">
              <Input
                placeholder="e.g., CA, BY, ON (ISO 3166-2)"
                value={value.subdivision || ''}
                onChange={e => updateLocation('subdivision', e.target.value)}
                disabled={disabled}
              />
            </FormFieldWrapper>
          </div>
        )}

        {visibleOptionalFields.includes('region') && (
          <div className="col-span-12 md:col-span-6">
            <FormFieldWrapper label="Region">
              <Input
                placeholder="e.g., ISO region code"
                value={value.region || ''}
                onChange={e => updateLocation('region', e.target.value)}
                disabled={disabled}
              />
            </FormFieldWrapper>
          </div>
        )}

        {visibleOptionalFields.includes('zipCode') && (
          <div className="col-span-12 md:col-span-6">
            <FormFieldWrapper label="ZIP Code">
              <Input
                placeholder="e.g., 94102, 80331, M5V 3A8"
                value={value.zipCode || ''}
                onChange={e => updateLocation('zipCode', e.target.value)}
                disabled={disabled}
              />
            </FormFieldWrapper>
          </div>
        )}

        {visibleOptionalFields.includes('address') && (
          <div className="col-span-12 md:col-span-6">
            <FormFieldWrapper label="Address">
              <Input
                placeholder="e.g., 123 Main St, Suite 100 or San Francisco"
                value={value.address || ''}
                onChange={e => updateLocation('address', e.target.value)}
                disabled={disabled}
              />
            </FormFieldWrapper>
          </div>
        )}

        {visibleOptionalFields.includes('latitude') && (
          <div className="col-span-12 md:col-span-6">
            <FormFieldWrapper label="Latitude">
              <Input
                type="number"
                step="any"
                placeholder="e.g., 37.7749"
                value={value.latitude ?? ''}
                onChange={e => updateLocation('latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={disabled}
              />
            </FormFieldWrapper>
          </div>
        )}

        {visibleOptionalFields.includes('longitude') && (
          <div className="col-span-12 md:col-span-6">
            <FormFieldWrapper label="Longitude">
              <Input
                type="number"
                step="any"
                placeholder="e.g., -122.4194"
                value={value.longitude ?? ''}
                onChange={e => updateLocation('longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={disabled}
              />
            </FormFieldWrapper>
          </div>
        )}

        {visibleOptionalFields.includes('geoBounds') && (
          <div className="col-span-12">
            <FormFieldWrapper label="Geospatial Bounds">
              <Input
                placeholder="e.g., Shapefile, KML, GeoJSON file path or URL"
                value={value.geoBounds || ''}
                onChange={e => updateLocation('geoBounds', e.target.value)}
                disabled={disabled}
              />
            </FormFieldWrapper>
          </div>
        )}
      </div>
    </div>
  )
}
