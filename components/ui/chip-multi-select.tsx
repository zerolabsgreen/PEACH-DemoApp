"use client"

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChipMultiSelectOption {
  value: string
  label: string
}

export interface ChipMultiSelectProps<T = string> {
  value: T[]
  onChange: (value: T[]) => void
  options: ChipMultiSelectOption[]
  label?: string
  description?: string
  placeholder?: string
  disabled?: boolean
  allowCreate?: boolean
  onCreateNew?: (value: string) => T
  getOptionLabel?: (value: T) => string
  getOptionValue?: (value: T) => string
  emptyMessage?: string
  createButtonText?: string
  className?: string
}

export default function ChipMultiSelect<T = string>({
  value = [],
  onChange,
  options,
  label,
  description,
  placeholder = 'Type to search...',
  disabled = false,
  allowCreate = false,
  onCreateNew,
  getOptionLabel = (val) => String(val),
  getOptionValue = (val) => String(val),
  emptyMessage = 'No items found.',
  createButtonText = "Can't find it? Create new",
  className,
}: ChipMultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get selected option labels
  const selectedLabels = value.map(val => {
    const option = options.find(opt => getOptionValue(val) === opt.value)
    return option ? option.label : getOptionLabel(val)
  })

  // Filter options based on search and exclude already selected
  const filteredOptions = options.filter(option => {
    const matchesSearch = !inputValue || 
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase())
    const notSelected = !value.some(val => getOptionValue(val) === option.value)
    return matchesSearch && notSelected
  })

  // Check if we should show create option
  const showCreateOption = allowCreate && 
    inputValue.trim() && 
    !options.some(opt => 
      opt.value.toLowerCase() === inputValue.trim().toLowerCase() ||
      opt.label.toLowerCase() === inputValue.trim().toLowerCase()
    ) &&
    !value.some(val => 
      getOptionValue(val).toLowerCase() === inputValue.trim().toLowerCase() ||
      getOptionLabel(val).toLowerCase() === inputValue.trim().toLowerCase()
    )

  const handleSelect = (optionValue: string) => {
    const option = options.find(opt => opt.value === optionValue)
    if (!option) return

    // Check if already selected
    if (value.some(val => getOptionValue(val) === optionValue)) {
      return
    }

    // Add to selection
    onChange([...value, optionValue as T])
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleCreateNew = () => {
    if (!allowCreate || !onCreateNew || !inputValue.trim()) return

    const newValue = onCreateNew(inputValue.trim())
    onChange([...value, newValue])
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleRemove = (itemToRemove: T) => {
    onChange(value.filter(item => getOptionValue(item) !== getOptionValue(itemToRemove)))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    // Backspace to remove last item when input is empty
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      e.preventDefault()
      handleRemove(value[value.length - 1])
      return
    }

    // Enter to create new if allowCreate and showCreateOption
    if (e.key === 'Enter' && showCreateOption && allowCreate && onCreateNew) {
      e.preventDefault()
      handleCreateNew()
      return
    }

    // Enter to select first filtered option
    if (e.key === 'Enter' && filteredOptions.length > 0 && !showCreateOption) {
      e.preventDefault()
      handleSelect(filteredOptions[0].value)
      return
    }

    // Escape to close
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }

    // Arrow down to open
    if (e.key === 'ArrowDown' && !open) {
      setOpen(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!open && e.target.value) {
      setOpen(true)
    }
  }

  const handleInputFocus = () => {
    if (inputValue) {
      setOpen(true)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      {(label || description) && (
        <div>
          {label && <div className="text-sm font-medium">{label}</div>}
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
      )}

      <div className="space-y-2">
        {/* Selected chips */}
        {selectedLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.map((item, index) => {
              const label = selectedLabels[index]
              return (
                <div
                  key={getOptionValue(item)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-sm"
                >
                  <span>{label}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      className="ml-0.5 rounded-sm hover:bg-secondary-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring p-0.5"
                      aria-label={`Remove ${label}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Input field with dropdown */}
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            disabled={disabled}
            className="w-full"
          />
          
          {open && (filteredOptions.length > 0 || showCreateOption) && (
            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md">
              <Command shouldFilter={false}>
                <CommandList className="max-h-[300px] overflow-y-auto">
                  {filteredOptions.length === 0 && !showCreateOption && (
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                  )}
                  <CommandGroup>
                    {filteredOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => handleSelect(option.value)}
                      >
                        {option.label}
                      </CommandItem>
                    ))}
                    {showCreateOption && (
                      <CommandItem
                        value={`__create__${inputValue}`}
                        onSelect={handleCreateNew}
                        className="text-primary font-medium"
                      >
                        + Create "{inputValue}"
                      </CommandItem>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
        </div>

        {/* Create new button (alternative to inline create) */}
        {/* i */}
      </div>
    </div>
  )
}

