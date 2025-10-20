"use client"

import React, { useState } from 'react'
import OptionalFieldsManager, { type OptionalField } from '@/components/ui/optional-fields-manager'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'

export interface OptionalFormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  optionalFields: OptionalField[]
  visibleOptionalFields: string[]
  onOptionalFieldsChange: (visibleFields: string[]) => void
  disabled?: boolean
  addButtonText?: string
  onAdd?: () => void
  showAddButton?: boolean
}

export default function OptionalFormSection({
  title,
  description,
  children,
  optionalFields,
  visibleOptionalFields,
  onOptionalFieldsChange,
  disabled = false,
  addButtonText = "Add item",
  onAdd,
  showAddButton = true,
}: OptionalFormSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-medium">
            {title}
          </div>
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <OptionalFieldsManager
            fields={optionalFields}
            visibleFields={visibleOptionalFields}
            onFieldsChange={onOptionalFieldsChange}
            disabled={disabled}
            buttonText="Optional fields"
          />
          {showAddButton && onAdd && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
              onClick={onAdd}
              disabled={disabled}
            >
              {addButtonText}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

// Helper hook for managing optional fields state
export function useOptionalFields(initialFields: string[] = []) {
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<string[]>(initialFields)
  
  return {
    visibleOptionalFields,
    setVisibleOptionalFields,
  }
}
