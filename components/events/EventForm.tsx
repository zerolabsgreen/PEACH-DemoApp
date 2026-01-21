"use client"

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import DatePicker from '@/components/ui/date-picker'
import LinksField from '@/components/ui/links-field'
import LocationField from '@/components/ui/location-field'
import MetadataField from '@/components/ui/metadata-field'
import { type DocumentFormItem } from '@/components/documents/DocumentUploader'
import { BackButton } from '@/components/ui/back-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import OptionalFormSection, { useOptionalFields } from '@/components/ui/optional-form-section'
import FormFieldWrapper from '@/components/ui/form-field-wrapper'
import OrganizationRoleField from '@/components/eacertificate/OrganizationRoleField'
import type { OrganizationRole } from '@/lib/types/eacertificate'
import { EACEventType, EAC_EVENT_TYPE_NAMES } from '@/lib/types/eacertificate'
import { createEvent, getEvent, updateEvent } from '@/lib/services/events'
import { listEACertificates } from '@/lib/services/eacertificates'
import { listProductionSources } from '@/lib/services/production-sources'
import { formatProductionSourceLabel } from '@/lib/utils/production-source-utils'
import { EventTarget, type CreateEventData, type UpdateEventData, type MetadataItem } from '@/lib/types/eacertificate'
import { toDateInputValue, parseDateInput } from '@/lib/date-utils'
import { format } from 'date-fns'
import { type OptionalField } from '@/components/ui/optional-fields-manager'

// Define optional fields configuration
const OPTIONAL_FIELDS: OptionalField[] = [
  {
    key: 'endDate',
    label: 'End Date',
    description: 'Optional end date for the event',
  },
  {
    key: 'value',
    label: 'Value',
    description: 'Arbitrary value associated with the event',
  },
  {
    key: 'location',
    label: 'Location',
    description: 'Event location information',
  },
  {
    key: 'notes',
    label: 'Notes',
    description: 'Additional notes about the event',
  },
  {
    key: 'links',
    label: 'Links',
    description: 'Related links and references',
  },
  {
    key: 'metadata',
    label: 'Metadata',
    description: 'Custom metadata fields',
  },
  {
    key: 'organizations',
    label: 'Organizations',
    description: 'Organizations and their roles for this event',
  },
]

export interface EventFormProps {
  mode: 'create' | 'edit'
  eventId?: string
  backHref: string
}

type TargetOption = {
  id: string
  label: string
  target: EventTarget
}

interface EventFormData {
  target: EventTarget
  targetId: string
  type: string
  dates: { start?: string; end?: string }
  value?: string
  location?: any
  organizations: OrganizationRole[]
  notes?: string // Optional notes or description of the event
  links?: string[]
  documents: DocumentFormItem[]
  metadata: MetadataItem[]
}

export default function EventForm({ mode, eventId, backHref }: EventFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [targets, setTargets] = useState<TargetOption[]>([])
  const { visibleOptionalFields, setVisibleOptionalFields } = useOptionalFields()

  const [form, setForm] = useState<EventFormData>({
    target: EventTarget.PSOURCE,
    targetId: '',
    type: '',
    dates: {},
    value: '',
    location: {} as any,
    organizations: [],
    notes: '',
    documents: [],
    links: [],
    metadata: [],
  })

  const set = (k: keyof EventFormData, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    const loadTargets = async () => {
      try {
        const [certs, sources] = await Promise.all([
          listEACertificates(),
          listProductionSources(),
        ])
        const certOptions: TargetOption[] = (certs ?? []).map((c: any) => ({
          id: c.id,
          label: `Certificate • ${c.type}`,
          target: EventTarget.EAC,
        }))
        const sourceOptions: TargetOption[] = (sources ?? []).map((s: any) => ({
          id: s.id,
          label: `Production Source • ${formatProductionSourceLabel(s)}`,
          target: EventTarget.PSOURCE,
        }))
        let options = [...certOptions, ...sourceOptions]

        // Prefill from query params if provided
        const qpTarget = searchParams?.get('target') as keyof typeof EventTarget | null
        const qpTargetId = searchParams?.get('targetId')
        if (qpTargetId) {
          const parsedTarget = qpTarget && EventTarget[qpTarget]
          // If not present in fetched options, add a placeholder so the select shows the value
          if (!options.find(o => o.id === qpTargetId) && parsedTarget) {
            const labelPrefix = parsedTarget === EventTarget.EAC ? 'Certificate' : 'Production Source'
            options = [{ id: qpTargetId, label: `${labelPrefix} • ${qpTargetId}`, target: parsedTarget }, ...options]
          }
          setForm(prev => ({
            ...prev,
            targetId: qpTargetId,
            target: (parsedTarget ?? prev.target) as EventTarget,
          }))
        }

        setTargets(options)
      } catch (_) {
        // ignore
      }
    }

    const loadExisting = async () => {
      if (mode === 'edit' && eventId) {
        setLoading(true)
        try {
          const ev = await getEvent(eventId)
          setForm({
            target: ev.target,
            targetId: ev.target_id,
            type: ev.type,
            dates: { start: toDateInputValue(ev.dates?.start), end: toDateInputValue(ev.dates?.end) },
            value: ev.value ?? '',
            location: (ev.location ?? {}) as any,
            organizations: ev.organizations ?? [],
            notes: ev.notes ?? '',
            documents: [],
            links: ev.links ?? [],
            metadata: ev.metadata ?? [],
          })
        } finally {
          setLoading(false)
        }
      }
    }

    loadTargets()
    loadExisting()
  }, [mode, eventId])

  const handleTargetIdChange = (id: string) => {
    set('targetId', id)
    const opt = targets.find(t => t.id === id)
    if (opt) set('target', opt.target)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (mode === 'create') {
        const payload: CreateEventData = {
          target: form.target,
          targetId: form.targetId,
          type: form.type,
          dates: {
            start: parseDateInput(form.dates.start as string) || new Date(),
            ...(form.dates.end ? { end: parseDateInput(form.dates.end) || new Date() } : {}),
          },
          value: form.value,
          location: form.location,
          organizations: form.organizations,
          notes: form.notes,
          links: form.links,
          metadata: form.metadata,
          // documents: form.documents,
        }
        await createEvent(payload)
      } else if (mode === 'edit' && eventId) {
        const patch: UpdateEventData = {
          target: form.target,
          targetId: form.targetId,
          type: form.type,
          dates: form.dates.start || form.dates.end
            ? {
                ...(form.dates.start ? { start: parseDateInput(form.dates.start) || new Date() } : {}),
                ...(form.dates.end ? { end: parseDateInput(form.dates.end) || new Date() } : {}),
              }
            : undefined,
          value: form.value,
          location: form.location,
          organizations: form.organizations,
          notes: form.notes,
          links: form.links,
          metadata: form.metadata,
        }
        await updateEvent(eventId, patch)
      }
      router.push(backHref)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <BackButton />
          <h1 className="text-2xl font-semibold">{mode === 'create' ? 'Create Event' : 'Edit Event'}</h1>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Required fields section */}
          <div className="space-y-4">
            <div>
              <FormFieldWrapper label="Target Id" required>
                <Select
                  value={form.targetId}
                  onValueChange={(value) => handleTargetIdChange(value)}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select target…" />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Target is derived automatically from selection.</p>
              </FormFieldWrapper>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormFieldWrapper label="Target">
                <Input value={form.target} readOnly disabled />
              </FormFieldWrapper>
              <FormFieldWrapper label="Type" required>
                <Select value={form.type} onValueChange={(value) => set('type', value)} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select event type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(EACEventType).map(eventType => (
                      <SelectItem key={eventType} value={eventType}>
                        {EAC_EVENT_TYPE_NAMES[eventType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormFieldWrapper>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="Start date"
                value={form.dates.start ? parseDateInput(form.dates.start) || undefined : undefined}
                onChange={(date) => set('dates', { ...form.dates, start: date ? format(date, 'yyyy-MM-dd') : undefined })}
                required
              />
              <FormFieldWrapper 
                label="End Date" 
                visible={visibleOptionalFields.includes('endDate')}
              >
                <DatePicker
                  label="End date"
                  value={form.dates.end ? parseDateInput(form.dates.end) || undefined : undefined}
                  onChange={(date) => set('dates', { ...form.dates, end: date ? format(date, 'yyyy-MM-dd') : undefined })}
                />
              </FormFieldWrapper>
            </div>
          </div>

          {/* Optional fields section */}
          <OptionalFormSection
            title="Additional Information"
            description="Optional details about this event"
            optionalFields={OPTIONAL_FIELDS}
            visibleOptionalFields={visibleOptionalFields}
            onOptionalFieldsChange={setVisibleOptionalFields}
            showAddButton={false}
          >
            <div className="space-y-4">
              <FormFieldWrapper
                label="Value"
                visible={visibleOptionalFields.includes('value')}
              >
                <Input value={form.value} onChange={e => set('value', e.target.value)} />
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Location"
                visible={visibleOptionalFields.includes('location')}
              >
                <LocationField value={form.location as any} onChange={(v) => set('location', v)} />
              </FormFieldWrapper>

              <FormFieldWrapper 
                label="Notes" 
                visible={visibleOptionalFields.includes('notes')}
              >
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
              </FormFieldWrapper>

              <FormFieldWrapper 
                label="Links" 
                visible={visibleOptionalFields.includes('links')}
              >
                <LinksField value={form.links ?? []} onChange={(v) => set('links', v)} />
              </FormFieldWrapper>

              <FormFieldWrapper 
                label="Metadata" 
                visible={visibleOptionalFields.includes('metadata')}
              >
                <MetadataField
                  value={form.metadata}
                  onChange={(v) => set('metadata', v)}
                  label="Metadata"
                  description="Add custom metadata fields for this event"
                />
              </FormFieldWrapper>

              <FormFieldWrapper 
                label="Organizations" 
                visible={visibleOptionalFields.includes('organizations')}
              >
                <OrganizationRoleField
                  value={form.organizations}
                  onChange={(orgs) => set('organizations', orgs)}
                  label="Organizations"
                  description="Assign roles to organizations for this event"
                />
              </FormFieldWrapper>
            </div>
          </OptionalFormSection>

            {/* {mode === 'create' && (
              <div>
                <DocumentUploader onChange={(items) => set('documents', items)} />
              </div>
            )} */}

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => router.push(backHref)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (mode === 'create' ? 'Create' : 'Save changes')}</Button>
            </div>
          </form>
      </div>
    </div>
  )
}


