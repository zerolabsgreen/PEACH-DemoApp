"use client"

import React, { useState } from 'react'
import DatePicker from '@/components/ui/date-picker'
import DatePickerFilter from '@/components/ui/date-picker-filter'
import ShadcnDatePickerExample from './ShadcnDatePickerExample'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DatePickerDemo() {
  const [formDate, setFormDate] = useState<Date | undefined>(undefined)
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Date Picker Components</h2>
        <p className="text-gray-600 mb-6">
          These date pickers display dates in YYYY-MM-DD format as requested.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Form Date Picker</CardTitle>
            <CardDescription>
              Full-featured date picker for forms with labels and validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DatePicker
              label="Start Date"
              value={formDate}
              onChange={setFormDate}
              placeholder="Select a date"
              required
            />
            <div className="text-sm text-gray-500">
              Selected: {formDate ? formDate.toISOString().split('T')[0] : 'None'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filter Date Picker</CardTitle>
            <CardDescription>
              Compact date picker for table filters and search interfaces
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Filter Date</label>
              <DatePickerFilter
                value={filterDate}
                onChange={setFilterDate}
                placeholder="Filter by date"
                className="w-[200px]"
              />
            </div>
            <div className="text-sm text-gray-500">
              Selected: {filterDate ? filterDate.toISOString().split('T')[0] : 'None'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>shadcn/ui Style</CardTitle>
            <CardDescription>
              Exact shadcn/ui pattern with month/year dropdowns and YYYY-MM-DD format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ShadcnDatePickerExample />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            What makes these date pickers special
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>YYYY-MM-DD Format:</strong> All dates display in the requested format</li>
            <li>✅ <strong>Month/Year Dropdowns:</strong> Easy navigation with dropdown selectors</li>
            <li>✅ <strong>shadcn/ui Styling:</strong> Consistent with your design system</li>
            <li>✅ <strong>Calendar Interface:</strong> Easy-to-use calendar popup</li>
            <li>✅ <strong>TypeScript Support:</strong> Full type safety</li>
            <li>✅ <strong>Accessibility:</strong> Keyboard navigation and screen reader support</li>
            <li>✅ <strong>Validation:</strong> Built-in date validation</li>
            <li>✅ <strong>Min/Max Dates:</strong> Support for date constraints</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default DatePickerDemo
