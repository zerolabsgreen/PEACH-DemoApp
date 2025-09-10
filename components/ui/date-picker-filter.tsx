"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerFilterProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  min?: Date
  max?: Date
}

export function DatePickerFilter({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  min,
  max,
}: DatePickerFilterProps) {
  const [open, setOpen] = React.useState(false)

  // Format date to YYYY-MM-DD for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return ""
    return format(date, "yyyy-MM-dd")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal text-xs",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          captionLayout="dropdown"
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
          disabled={(date) => {
            if (min && date < min) return true
            if (max && date > max) return true
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePickerFilter
