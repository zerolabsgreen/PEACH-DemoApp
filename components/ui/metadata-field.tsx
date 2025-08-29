"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MetadataItem } from '@/lib/types/eacertificate'

export interface MetadataFieldProps {
  value: MetadataItem[]
  onChange: (value: MetadataItem[]) => void
  label?: string
  description?: string
  disabled?: boolean
}

export default function MetadataField({
  value,
  onChange,
  label = 'Metadata',
  description,
  disabled = false,
}: MetadataFieldProps) {
  const items = value ?? []

  const addItem = () => {
    onChange([...items, { key: '', label: '', value: '' }])
  }

  const removeItem = (index: number) => {
    const next = [...items]
    next.splice(index, 1)
    onChange(next)
  }

  const updateItem = (index: number, field: keyof MetadataItem, newValue: string) => {
    const next = [...items]
    next[index] = { ...next[index], [field]: newValue }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={disabled}>
          Add metadata
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Key</label>
                <Input
                  placeholder="key"
                  value={item.key}
                  onChange={(e) => updateItem(idx, 'key', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label</label>
                <Input
                  placeholder="label"
                  value={item.label}
                  onChange={(e) => updateItem(idx, 'label', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Value</label>
                <Input
                  placeholder="value"
                  value={item.value || ''}
                  onChange={(e) => updateItem(idx, 'value', e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(idx)}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500">No metadata added yet.</div>
        )}
      </div>
    </div>
  )
}
