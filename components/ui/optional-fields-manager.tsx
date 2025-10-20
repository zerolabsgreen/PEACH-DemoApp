"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings2, ChevronDown } from 'lucide-react'

export interface OptionalField {
  key: string
  label: string
  description?: string
  required?: boolean
}

export interface OptionalFieldsManagerProps {
  fields: OptionalField[]
  visibleFields: string[]
  onFieldsChange: (visibleFields: string[]) => void
  disabled?: boolean
  buttonText?: string
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export default function OptionalFieldsManager({
  fields,
  visibleFields,
  onFieldsChange,
  disabled = false,
  buttonText = "Optional fields",
  buttonVariant = "outline",
  buttonSize = "sm",
  className = "",
}: OptionalFieldsManagerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    if (checked) {
      onFieldsChange([...visibleFields, fieldKey])
    } else {
      onFieldsChange(visibleFields.filter(key => key !== fieldKey))
    }
  }

  const optionalFields = fields.filter(field => !field.required)
  const hasOptionalFields = optionalFields.length > 0

  if (!hasOptionalFields) {
    return null
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled}
          className={`gap-2 ${className}`}
        >
          <Settings2 className="h-4 w-4" />
          {buttonText}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm">Optional Fields</h4>
            <p className="text-xs text-muted-foreground">
              Select which optional fields to display in the form
            </p>
          </div>
          
          <div className="space-y-3">
            {optionalFields.map((field) => (
              <div key={field.key} className="flex items-start space-x-3">
                <Checkbox
                  id={field.key}
                  checked={visibleFields.includes(field.key)}
                  onCheckedChange={(checked) => handleFieldToggle(field.key, checked as boolean)}
                  disabled={disabled}
                />
                <div className="space-y-1">
                  <label
                    htmlFor={field.key}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {field.label}
                  </label>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
