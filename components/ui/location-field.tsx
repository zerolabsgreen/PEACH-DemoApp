"use client"

import React, { useState } from 'react'
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
    key: 'state',
    label: 'State/Region',
    description: 'State or region information',
  },
  {
    key: 'city',
    label: 'City',
    description: 'City information',
  },
  {
    key: 'postalCode',
    label: 'Postal Code',
    description: 'Postal or ZIP code',
  },
  {
    key: 'address',
    label: 'Address',
    description: 'Street address',
  },
]

export interface LocationFieldProps {
  value: Location
  onChange: (value: Location) => void
  label?: string
  required?: boolean
  disabled?: boolean
}

export default function LocationField({
  value,
  onChange,
  label = 'Location',
  required = false,
  disabled = false,
}: LocationFieldProps) {
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<string[]>([])
  
  const updateLocation = (field: keyof Location, newValue: string) => {
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
        
        <div className="col-span-12 md:col-span-6">
          <FormFieldWrapper 
            label="State/Region" 
            visible={visibleOptionalFields.includes('state')}
          >
            <Input 
              placeholder="e.g., California, Bavaria, Ontario" 
              value={value.state || ''} 
              onChange={e => updateLocation('state', e.target.value)} 
              disabled={disabled}
            />
          </FormFieldWrapper>
        </div>
        
        <div className="col-span-12 md:col-span-4">
          <FormFieldWrapper 
            label="City" 
            visible={visibleOptionalFields.includes('city')}
          >
            <Input 
              placeholder="e.g., San Francisco, Munich, Toronto" 
              value={value.city || ''} 
              onChange={e => updateLocation('city', e.target.value)} 
              disabled={disabled}
            />
          </FormFieldWrapper>
        </div>
        
        <div className="col-span-12 md:col-span-4">
          <FormFieldWrapper 
            label="Postal Code" 
            visible={visibleOptionalFields.includes('postalCode')}
          >
            <Input 
              placeholder="e.g., 94102, 80331, M5V 3A8" 
              value={value.postalCode || ''} 
              onChange={e => updateLocation('postalCode', e.target.value)} 
              disabled={disabled}
            />
          </FormFieldWrapper>
        </div>
        
        <div className="col-span-12 md:col-span-4">
          <FormFieldWrapper 
            label="Address" 
            visible={visibleOptionalFields.includes('address')}
          >
            <Input 
              placeholder="e.g., 123 Main St, Suite 100" 
              value={value.address || ''} 
              onChange={e => updateLocation('address', e.target.value)} 
              disabled={disabled}
            />
          </FormFieldWrapper>
        </div>
      </div>
    </div>
  )
}
