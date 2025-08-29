"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { EmissionsData, EmissionsUnit } from '@/lib/types/eacertificate'

export interface EmissionsFieldProps {
  value: EmissionsData[]
  onChange: (value: EmissionsData[]) => void
  label?: string
  description?: string
  disabled?: boolean
}

const COMMON_EMISSIONS_UNITS: EmissionsUnit[] = ['gCO2e/kWh', 'gCO2e/MJ', 'gCO2e/MMBtu', 'tCO2e/MWh']

export default function EmissionsField({
  value,
  onChange,
  label = 'Emissions',
  description,
  disabled = false,
}: EmissionsFieldProps) {
  const emissions = value ?? []

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
        <Button type="button" variant="outline" size="sm" onClick={addEmission} disabled={disabled}>
          Add emission data
        </Button>
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Carbon Intensity *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={emission.carbonIntensity || ''}
                  onChange={(e) => updateEmission(idx, { carbonIntensity: parseFloat(e.target.value) || 0 })}
                  required
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">CI Unit</label>
                <select
                  value={emission.ciUnit || 'gCO2e/kWh'}
                  onChange={(e) => updateEmission(idx, { ciUnit: e.target.value as EmissionsUnit })}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COMMON_EMISSIONS_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">CI Notes</label>
              <Input
                placeholder="Additional notes about carbon intensity"
                value={emission.ciNotes || ''}
                onChange={(e) => updateEmission(idx, { ciNotes: e.target.value })}
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Emissions Factor *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={emission.emissionsFactor || ''}
                  onChange={(e) => updateEmission(idx, { emissionsFactor: parseFloat(e.target.value) || 0 })}
                  required
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">EF Unit</label>
                <select
                  value={emission.efUnit || 'gCO2e/kWh'}
                  onChange={(e) => updateEmission(idx, { efUnit: e.target.value as EmissionsUnit })}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COMMON_EMISSIONS_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">EF Notes</label>
              <Input
                placeholder="Additional notes about emissions factor"
                value={emission.efNotes || ''}
                onChange={(e) => updateEmission(idx, { efNotes: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
        ))}
        
        {emissions.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded-md">
            No emissions data added yet. Click "Add emission data" to get started.
          </div>
        )}
      </div>
    </div>
  )
}
