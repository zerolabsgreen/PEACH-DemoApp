"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import type { Contact } from '@/lib/types/eacertificate'

export interface ContactsFieldProps {
  value: Contact[]
  onChange: (value: Contact[]) => void
  label?: string
  description?: string
  disabled?: boolean
}

export default function ContactsField({
  value,
  onChange,
  label = 'Contacts',
  description,
  disabled = false,
}: ContactsFieldProps) {
  const contacts = value ?? []

  const addContact = () => {
    onChange([...contacts, { value: '', label: '' }])
  }

  const removeContact = (index: number) => {
    const next = [...contacts]
    next.splice(index, 1)
    onChange(next)
  }

  const updateContact = (index: number, field: keyof Contact, newValue: string) => {
    const next = [...contacts]
    next[index] = { ...next[index], [field]: newValue }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContact}
          disabled={disabled}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add contact
        </Button>
      </div>

      <div className="space-y-3">
        {contacts.map((contact, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                placeholder="email@example.com, +1 555-555-5555"
                value={contact.value}
                onChange={(e) => updateContact(idx, 'value', e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="w-32">
              <Input
                placeholder="Label"
                value={contact.label || ''}
                onChange={(e) => updateContact(idx, 'label', e.target.value)}
                disabled={disabled}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeContact(idx)}
              disabled={disabled}
              className="h-9 w-9 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="text-sm text-gray-500 py-2">No contacts added yet.</div>
        )}
      </div>
    </div>
  )
}
