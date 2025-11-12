"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

export interface FormFieldWrapperProps {
  children: React.ReactNode
  label?: string
  required?: boolean
  description?: string
  className?: string
  visible?: boolean
}

export default function FormFieldWrapper({
  children,
  label = '',
  required = false,
  description,
  className = "",
  visible = true,
}: FormFieldWrapperProps) {
  if (!visible) {
    return null
  }

  return (
    <div className={cn("space-y-1", className)}>
      {label && <Label>
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>}
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
