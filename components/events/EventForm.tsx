"use client"

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import LinksField from '@/components/ui/links-field'
import LocationField from '@/components/ui/location-field'
// Metadata removed for events for now
import DocumentUploader, { type DocumentFormItem } from '@/components/documents/DocumentUploader'
import { BackButton } from '@/components/ui/back-button'
import { createEvent, getEvent, updateEvent } from '@/lib/services/events'
import { listEACertificates } from '@/lib/services/eacertificates'
import { listProductionSources } from '@/lib/services/production-sources'
import { createClientComponentClient } from '@/lib/supabase'
import { EventTarget, type CreateEventData, type UpdateEventData } from '@/lib/types/eacertificate'

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
  description?: string
  dates: { start?: string; end?: string }
  location?: any
  organizations?: any[]
  notes?: string
  links?: string[]
  documents: DocumentFormItem[]
}

export default function EventForm({ mode, eventId, backHref }: EventFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [targets, setTargets] = useState<TargetOption[]>([])

  const [form, setForm] = useState<EventFormData>({
    target: EventTarget.PSOURCE,
    targetId: '',
    type: '',
    description: '',
    dates: {},
    location: {} as any,
    organizations: [],
    notes: '',
    documents: [],
    links: [],
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
          label: `Production Source • ${s.name ?? s.id}`,
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
            description: ev.description ?? '',
            dates: { start: ev.dates?.start ? String(ev.dates.start).slice(0,10) : undefined, end: ev.dates?.end ? String(ev.dates.end).slice(0,10) : undefined },
            location: (ev.location ?? {}) as any,
            organizations: ev.organizations ?? [],
            notes: ev.notes ?? '',
            documents: [],
            links: ev.links ?? [],
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
          description: form.description,
          dates: {
            start: new Date(form.dates.start as string),
            ...(form.dates.end ? { end: new Date(form.dates.end) } : {}),
          },
          location: form.location,
          organizations: form.organizations,
          notes: form.notes,
          links: form.links,
          // documents: form.documents,
        }
        await createEvent(payload)
      } else if (mode === 'edit' && eventId) {
        const patch: UpdateEventData = {
          target: form.target,
          targetId: form.targetId,
          type: form.type,
          description: form.description,
          dates: form.dates.start || form.dates.end
            ? {
                ...(form.dates.start ? { start: new Date(form.dates.start) } : {}),
                ...(form.dates.end ? { end: new Date(form.dates.end) } : {}),
              }
            : undefined,
          location: form.location,
          organizations: form.organizations,
          notes: form.notes,
          links: form.links,
        }
        await updateEvent(eventId, patch)
      }
      router.push(backHref)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BackButton />
            <h1 className="text-2xl font-semibold">{mode === 'create' ? 'Create Event' : 'Edit Event'}</h1>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Id<span className="text-red-600"> *</span></label>
              <select
                className="mt-1 block w-full border rounded px-3 py-2"
                value={form.targetId}
                onChange={(e) => handleTargetIdChange(e.target.value)}
                required
              >
                <option value="" disabled>Select target…</option>
                {targets.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Target is derived automatically from selection.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Target</label>
                <Input value={form.target} readOnly disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type<span className="text-red-600"> *</span></label>
                <Input value={form.type} onChange={e => set('type', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start date<span className="text-red-600"> *</span></label>
                <Input
                  type="date"
                  value={form.dates.start ?? ''}
                  onChange={e => set('dates', { ...form.dates, start: e.target.value || undefined })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End date</label>
                <Input
                  type="date"
                  value={form.dates.end ?? ''}
                  onChange={e => set('dates', { ...form.dates, end: e.target.value || undefined })}
                />
              </div>
            </div>

            <LocationField value={form.location as any} onChange={(v) => set('location', v)} />

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
            </div>

            <LinksField value={form.links ?? []} onChange={(v) => set('links', v)} />

            {/* {mode === 'create' && (
              <div>
                <DocumentUploader onChange={(items) => set('documents', items)} />
              </div>
            )} */}

            {/* Metadata field removed for events */}

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => router.push(backHref)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : (mode === 'create' ? 'Create' : 'Save changes')}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


