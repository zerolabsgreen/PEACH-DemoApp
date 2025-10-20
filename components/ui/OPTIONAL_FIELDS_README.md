# Optional Fields System

This system provides a reusable way to manage optional form fields that are hidden by default and can be shown/hidden via a popover interface.

## Components

### 1. OptionalFieldsManager

A popover-based component that allows users to toggle the visibility of optional fields.

```tsx
import OptionalFieldsManager, { type OptionalField } from '@/components/ui/optional-fields-manager'

const OPTIONAL_FIELDS: OptionalField[] = [
  {
    key: 'fieldKey',
    label: 'Field Label',
    description: 'Optional description',
    required: false, // optional, defaults to false
  },
]

<OptionalFieldsManager
  fields={OPTIONAL_FIELDS}
  visibleFields={visibleFields}
  onFieldsChange={setVisibleFields}
  disabled={false}
  buttonText="Optional fields"
  buttonVariant="outline"
  buttonSize="sm"
/>
```

### 2. FormFieldWrapper

A wrapper component that handles field visibility and consistent styling.

```tsx
import FormFieldWrapper from '@/components/ui/form-field-wrapper'

<FormFieldWrapper
  label="Field Label"
  required={true}
  description="Optional description"
  visible={visibleFields.includes('fieldKey')}
  className="custom-class"
>
  <Input {...inputProps} />
</FormFieldWrapper>
```

### 3. OptionalFormSection

A higher-level component that combines OptionalFieldsManager with form sections.

```tsx
import OptionalFormSection, { useOptionalFields } from '@/components/ui/optional-form-section'

const { visibleOptionalFields, setVisibleOptionalFields } = useOptionalFields()

<OptionalFormSection
  title="Section Title"
  description="Section description"
  optionalFields={OPTIONAL_FIELDS}
  visibleOptionalFields={visibleOptionalFields}
  onOptionalFieldsChange={setVisibleOptionalFields}
  addButtonText="Add item"
  onAdd={handleAdd}
>
  {/* Form content */}
</OptionalFormSection>
```

## Usage Examples

### Basic Form Field

```tsx
const [visibleFields, setVisibleFields] = useState<string[]>([])

const OPTIONAL_FIELDS: OptionalField[] = [
  { key: 'notes', label: 'Notes', description: 'Additional notes' },
  { key: 'metadata', label: 'Metadata', description: 'Custom metadata' },
]

// In your form
<FormFieldWrapper
  label="Notes"
  visible={visibleFields.includes('notes')}
>
  <Textarea value={notes} onChange={setNotes} />
</FormFieldWrapper>
```

### Complex Form with Multiple Sections

```tsx
const { visibleOptionalFields, setVisibleOptionalFields } = useOptionalFields()

const AMOUNTS_OPTIONAL_FIELDS: OptionalField[] = [
  { key: 'conversionFactor', label: 'Conversion Factor' },
  { key: 'conversionNotes', label: 'Conversion Notes' },
]

const EMISSIONS_OPTIONAL_FIELDS: OptionalField[] = [
  { key: 'ciNotes', label: 'CI Notes' },
  { key: 'efNotes', label: 'EF Notes' },
]

// Amounts section
<OptionalFormSection
  title="Amounts"
  description="Energy or carbon amounts"
  optionalFields={AMOUNTS_OPTIONAL_FIELDS}
  visibleOptionalFields={visibleOptionalFields}
  onOptionalFieldsChange={setVisibleOptionalFields}
  onAdd={addAmount}
>
  {amounts.map((amount, idx) => (
    <div key={idx}>
      <FormFieldWrapper label="Amount" required>
        <Input value={amount.amount} onChange={...} />
      </FormFieldWrapper>
      <FormFieldWrapper 
        label="Conversion Factor" 
        visible={visibleOptionalFields.includes('conversionFactor')}
      >
        <Input value={amount.conversionFactor} onChange={...} />
      </FormFieldWrapper>
    </div>
  ))}
</OptionalFormSection>
```

## Field Configuration

### Required Fields
- Always visible by default
- Marked with `required={true}` in FormFieldWrapper
- Should not be included in optional fields configuration

### Optional Fields
- Hidden by default
- Can be toggled via OptionalFieldsManager
- Should be included in the optional fields configuration
- Use `visible={visibleFields.includes('fieldKey')}` to control visibility

## Best Practices

1. **Consistent Naming**: Use descriptive keys for optional fields that match the field purpose
2. **Clear Labels**: Provide clear, user-friendly labels and descriptions
3. **Logical Grouping**: Group related optional fields together
4. **State Management**: Use the `useOptionalFields` hook for consistent state management
5. **Accessibility**: Ensure all fields are properly labeled and accessible

## Migration Guide

To migrate existing forms to use the optional fields system:

1. Identify which fields should be optional vs required
2. Create an `OPTIONAL_FIELDS` configuration array
3. Add state management for visible fields
4. Wrap form sections with `OptionalFormSection` or add `OptionalFieldsManager` to headers
5. Wrap individual fields with `FormFieldWrapper` and add visibility logic
6. Test the functionality to ensure fields show/hide correctly

## Example: Complete Form Implementation

```tsx
"use client"

import React, { useState } from 'react'
import { useOptionalFields } from '@/components/ui/optional-form-section'
import OptionalFormSection from '@/components/ui/optional-form-section'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'
import { Input } from '@/components/ui/input'

const OPTIONAL_FIELDS = [
  { key: 'description', label: 'Description' },
  { key: 'notes', label: 'Notes' },
  { key: 'metadata', label: 'Metadata' },
]

export default function MyForm() {
  const { visibleOptionalFields, setVisibleOptionalFields } = useOptionalFields()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: '',
    metadata: '',
  })

  return (
    <form className="space-y-6">
      <OptionalFormSection
        title="Basic Information"
        description="Required and optional information"
        optionalFields={OPTIONAL_FIELDS}
        visibleOptionalFields={visibleOptionalFields}
        onOptionalFieldsChange={setVisibleOptionalFields}
        showAddButton={false}
      >
        <div className="space-y-4">
          <FormFieldWrapper label="Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </FormFieldWrapper>
          
          <FormFieldWrapper 
            label="Description" 
            visible={visibleOptionalFields.includes('description')}
          >
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </FormFieldWrapper>
          
          <FormFieldWrapper 
            label="Notes" 
            visible={visibleOptionalFields.includes('notes')}
          >
            <Input
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </FormFieldWrapper>
        </div>
      </OptionalFormSection>
    </form>
  )
}
```
