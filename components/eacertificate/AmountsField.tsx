"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Amount, AmountUnit } from '@/lib/types/eacertificate'

export interface AmountsFieldProps {
  value: Amount[]
  onChange: (value: Amount[]) => void
  label?: string
  description?: string
  disabled?: boolean
}

const COMMON_UNITS: AmountUnit[] = ['MWh', 'kWh', 'MMBtu', 'MJ', 'gallons', 'tCO2e', 'kgCO2e']

export default function AmountsField({
  value,
  onChange,
  label = 'Amounts',
  description,
  disabled = false,
}: AmountsFieldProps) {
  const amounts = Array.isArray(value) ? value : []

  const addAmount = () => {
    onChange([
      ...amounts,
      { amount: 1, unit: 'MWh', isPrimary: amounts.length === 0 },
    ])
  }

  const removeAmount = (index: number) => {
    const next = [...amounts]
    next.splice(index, 1)
    // If we're removing the primary amount, make the first remaining one primary
    if (next.length > 0 && amounts[index].isPrimary) {
      next[0].isPrimary = true
    }
    onChange(next)
  }

  const updateAmount = (index: number, patch: Partial<Amount>) => {
    const next = [...amounts]
    next[index] = { ...(next[index] ?? { amount: 0, unit: 'MWh' }), ...patch }
    
    // If this amount is being marked as primary, unmark others
    if (patch.isPrimary) {
      next.forEach((amount, i) => {
        if (i !== index) {
          amount.isPrimary = false
        }
      })
    }
    
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">
            {label} <span className="text-red-600">*</span>
          </div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addAmount} disabled={disabled}>
          Add amount
        </Button>
      </div>

      <div className="space-y-4">
        {amounts.map((amount, idx) => (
          <div key={idx} className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Amount {idx + 1}</div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={amount.isPrimary || false}
                    onChange={(e) => updateAmount(idx, { isPrimary: e.target.checked })}
                    disabled={disabled}
                    className="rounded border-gray-300"
                  />
                  Primary
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAmount(idx)}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount.amount || ''}
                  onChange={(e) => updateAmount(idx, { amount: parseFloat(e.target.value) || 0 })}
                  required
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unit *</label>
                <select
                  value={amount.unit || 'MWh'}
                  onChange={(e) => updateAmount(idx, { unit: e.target.value as AmountUnit })}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {COMMON_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Conversion Factor</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1.00"
                  value={amount.conversionFactor || ''}
                  onChange={(e) => updateAmount(idx, { conversionFactor: parseFloat(e.target.value) || undefined })}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Conversion Notes</label>
                <Input
                  placeholder="e.g., MWh to kWh conversion"
                  value={amount.conversionNotes || ''}
                  onChange={(e) => updateAmount(idx, { conversionNotes: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}
        
        {amounts.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded-md">
            <div className="mb-2">No amounts added yet.</div>
            <div className="text-xs text-gray-400">At least one amount is required to create a certificate.</div>
            <div className="mt-2">Click "Add amount" to get started.</div>
          </div>
        )}
      </div>
    </div>
  )
}
