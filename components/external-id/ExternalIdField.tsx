"use client"

import React, { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ExternalID } from '@/lib/types/eacertificate'

export interface ExternalIdFieldProps {
  value: ExternalID[]
  onChange: (value: ExternalID[]) => void
  label?: ReactNode
  description?: string
  disabled?: boolean
  requiredId?: boolean
  addButtonText?: string
}

export default function ExternalIdField({
  value,
  onChange,
  label = 'External IDs',
  description,
  disabled = false,
  requiredId = true,
  addButtonText = 'Add external ID',
}: ExternalIdFieldProps) {
  const items = value ?? []

  const addItem = () => {
    onChange([
      ...items,
      { id: '', ownerOrgId: '', ownerOrgName: '', description: '', externalFieldName: '' },
    ])
  }

  const removeItem = (index: number) => {
    const next = [...items]
    next.splice(index, 1)
    onChange(next)
  }

  const updateItem = (index: number, patch: Partial<ExternalID>) => {
    const next = [...items]
    next[index] = { ...(next[index] ?? { id: '' }), ...patch }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">
            {label} <span className="text-xs text-muted-foreground">(id{requiredId ? ' required' : ' optional'})</span>
          </div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={disabled}>
          {addButtonText}
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  ID {requiredId ? <span className="text-red-600">*</span> : null}
                </label>
                <Input
                  placeholder="external id"
                  value={item.id ?? ''}
                  onChange={(e) => updateItem(idx, { id: e.target.value })}
                  required={requiredId}
                  aria-required={requiredId}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">External field name</label>
                <Input
                  placeholder="external field name"
                  value={item.externalFieldName ?? ''}
                  onChange={(e) => updateItem(idx, { externalFieldName: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Owner org ID</label>
                <Input
                  placeholder="owner org id"
                  value={item.ownerOrgId ?? ''}
                  onChange={(e) => updateItem(idx, { ownerOrgId: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Owner org name</label>
                <Input
                  placeholder="owner org name"
                  value={item.ownerOrgName ?? ''}
                  onChange={(e) => updateItem(idx, { ownerOrgName: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <Input
                placeholder="description"
                value={item.description ?? ''}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
                disabled={disabled}
              />
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
          <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded-md">
            <div className="mb-2">No external IDs added yet.</div>
            <div className="text-xs text-gray-400">External identifiers for this certificate</div>
            <div className="mt-2">Click "{addButtonText}" to get started.</div>
          </div>
        )}
      </div>
    </div>
  )
}


