"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import type { Location } from '@/lib/types/eacertificate'

let countryNames: string[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { countries } = require('countries-list') as any
  countryNames = Object.values(countries).map((c: any) => c.name).sort()
} catch (_) {
  countryNames = []
}

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
  const updateLocation = (field: keyof Location, newValue: string) => {
    onChange({ ...value, [field]: newValue })
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <div className="grid grid-cols-12 gap-4 mt-2">
        <div className="col-span-12 md:col-span-6">
          <label className="block text-xs text-gray-500 mb-1">
            Country{required ? <span className="text-red-600"> *</span> : ''}
          </label>
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
        </div>
        <div className="col-span-12 md:col-span-6">
          <label className="block text-xs text-gray-500 mb-1">State/Region</label>
          <Input 
            placeholder="e.g., California, Bavaria, Ontario" 
            value={value.state || ''} 
            onChange={e => updateLocation('state', e.target.value)} 
            disabled={disabled}
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <label className="block text-xs text-gray-500 mb-1">City</label>
          <Input 
            placeholder="e.g., San Francisco, Munich, Toronto" 
            value={value.city || ''} 
            onChange={e => updateLocation('city', e.target.value)} 
            disabled={disabled}
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <label className="block text-xs text-gray-500 mb-1">Postal Code</label>
          <Input 
            placeholder="e.g., 94102, 80331, M5V 3A8" 
            value={value.postalCode || ''} 
            onChange={e => updateLocation('postalCode', e.target.value)} 
            disabled={disabled}
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <label className="block text-xs text-gray-500 mb-1">Address</label>
          <Input 
            placeholder="e.g., 123 Main St, Suite 100" 
            value={value.address || ''} 
            onChange={e => updateLocation('address', e.target.value)} 
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
