"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import OptionalFieldsManager, { type OptionalField } from '@/components/ui/optional-fields-manager'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'
import type { EmissionsData, EmissionsUnit } from '@/lib/types/eacertificate'

export interface EmissionsFieldProps {
  value: EmissionsData[]
  onChange: (value: EmissionsData[]) => void
  label?: string
  description?: string
  disabled?: boolean
}

const COMMON_EMISSIONS_UNITS: EmissionsUnit[] = ['gCO2e/kWh', 'gCO2e/MJ', 'gCO2e/MMBtu', 'tCO2e/MWh']

// Define optional fields configuration
const OPTIONAL_FIELDS: OptionalField[] = [
  {
    key: 'ciNotes',
    label: 'CI Notes',
    description: 'Additional notes about carbon intensity',
  },
  {
    key: 'efNotes',
    label: 'EF Notes',
    description: 'Additional notes about emissions factor',
  },
]

export default function EmissionsField({
  value,
  onChange,
  label = 'Emissions Data',
  description,
  disabled = false,
}: EmissionsFieldProps) {
  const emissions = value ?? []
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<string[]>([])

  const addEmission = () => {
    onChange([
      ...emissions,
      { carbonIntensity: 0, emissionsFactor: 0 },
    ])
  }

  const removeEmission = (index: number) => {
    const next = [...emissions]
    next.splice(index, 1)
    onChange(next)
  }

  const updateEmission = (index: number, patch: Partial<EmissionsData>) => {
    const next = [...emissions]
    next[index] = { ...(next[index] ?? { carbonIntensity: 0, emissionsFactor: 0 }), ...patch }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <OptionalFieldsManager
            fields={OPTIONAL_FIELDS}
            visibleFields={visibleOptionalFields}
            onFieldsChange={setVisibleOptionalFields}
            disabled={disabled}
            buttonText="Optional fields"
          />
          <Button type="button" variant="outline" size="sm" onClick={addEmission} disabled={disabled}>
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {emissions.map((emission, idx) => (
          <div key={idx} className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Emission Data {idx + 1}</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEmission(idx)}
                disabled={disabled}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                Remove
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormFieldWrapper label="Carbon Intensity" required>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={emission.carbonIntensity || ''}
                  onChange={(e) => updateEmission(idx, { carbonIntensity: parseFloat(e.target.value) || 0 })}
                  required
                  disabled={disabled}
                />
              </FormFieldWrapper>
              <FormFieldWrapper label="CI Unit" required>
                <Select
                  value={emission.ciUnit || 'gCO2e/kWh'}
                  onValueChange={(value) => updateEmission(idx, { ciUnit: value as EmissionsUnit })}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_EMISSIONS_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormFieldWrapper>
            </div>

            <FormFieldWrapper 
              label="CI Notes" 
              visible={visibleOptionalFields.includes('ciNotes')}
            >
              <Input
                placeholder="Additional notes about carbon intensity"
                value={emission.ciNotes || ''}
                onChange={(e) => updateEmission(idx, { ciNotes: e.target.value })}
                disabled={disabled}
              />
            </FormFieldWrapper>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormFieldWrapper label="Emissions Factor" required>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={emission.emissionsFactor || ''}
                  onChange={(e) => updateEmission(idx, { emissionsFactor: parseFloat(e.target.value) || 0 })}
                  required
                  disabled={disabled}
                />
              </FormFieldWrapper>
              <FormFieldWrapper label="EF Unit" required>
                <Select
                  value={emission.efUnit || 'gCO2e/kWh'}
                  onValueChange={(value) => updateEmission(idx, { efUnit: value as EmissionsUnit })}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_EMISSIONS_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormFieldWrapper>
            </div>

            <FormFieldWrapper 
              label="EF Notes" 
              visible={visibleOptionalFields.includes('efNotes')}
            >
              <Input
                placeholder="Additional notes about emissions factor"
                value={emission.efNotes || ''}
                onChange={(e) => updateEmission(idx, { efNotes: e.target.value })}
                disabled={disabled}
              />
            </FormFieldWrapper>
          </div>
        ))}
        
        {emissions.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded-md">
            No emissions data added yet. Click "Add" to get started.
          </div>
        )}
      </div>
    </div>
  )
}
