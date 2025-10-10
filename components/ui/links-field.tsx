"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface LinksFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  description?: string
  placeholder?: string
  disabled?: boolean
}

export default function LinksField({
  value,
  onChange,
  label = 'Links',
  description,
  placeholder = 'https://example.com',
  disabled = false,
}: LinksFieldProps) {
  const items = value ?? []

  const addItem = () => {
    onChange([...items, ''])
  }

  const removeItem = (index: number) => {
    const next = [...items]
    next.splice(index, 1)
    onChange(next)
  }

  const updateItem = (index: number, newValue: string) => {
    const next = [...items]
    next[index] = newValue
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
          Add link
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-3">
            <Input
              placeholder={placeholder}
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              disabled={disabled}
            />
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
        ))}
        {items.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded-md">
            <div className="mb-2">No links added yet.</div>
            <div className="text-xs text-gray-400">Related URLs and references</div>
            <div className="mt-2">Click "Add link" to get started.</div>
          </div>
        )}
      </div>
    </div>
  )
}
