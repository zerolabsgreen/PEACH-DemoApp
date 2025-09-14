"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import DatePicker from '@/components/ui/date-picker'
import LinksField from '@/components/ui/links-field'
import LocationField from '@/components/ui/location-field'
import { BackButton } from '@/components/ui/back-button'
import { createEvent } from '@/lib/services/events'
import { getEACertificate } from '@/lib/services/eacertificates'
import { EventTarget, type CreateEventData } from '@/lib/types/eacertificate'
import { parseDateInput } from '@/lib/date-utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface EventFormData {
  type: string
  description?: string
  dates: { start?: string; end?: string }
  location?: any
  organizations?: any[]
  notes?: string
  links?: string[]
}

export default function CreateEventsPage() {
  const params = useParams()
  const router = useRouter()
  const certificateId = params.id as string
  
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventFormData[]>([
    {
      type: '',
      description: '',
      dates: {},
      location: {} as any,
      organizations: [],
      notes: '',
      links: [],
    }
  ])

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        const cert = await getEACertificate(certificateId)
        setCertificate(cert)
      } catch (error) {
        console.error('Failed to load certificate:', error)
        toast.error('Failed to load certificate')
      } finally {
        setLoading(false)
      }
    }

    if (certificateId) {
      loadCertificate()
    }
  }, [certificateId])

  const addEvent = () => {
    setEvents(prev => [...prev, {
      type: '',
      description: '',
      dates: {},
      location: {} as any,
      organizations: [],
      notes: '',
      links: [],
    }])
  }

  const removeEvent = (index: number) => {
    setEvents(prev => prev.filter((_, i) => i !== index))
  }

  const updateEvent = (index: number, field: keyof EventFormData, value: any) => {
    setEvents(prev => prev.map((event, i) => 
      i === index ? { ...event, [field]: value } : event
    ))
  }

  const handleSubmit = async () => {
    try {
      const validEvents = events.filter(event => event.type.trim() !== '')
      
      if (validEvents.length === 0) {
        toast.info('No events to create')
        return
      }

      const createPromises = validEvents.map(event => {
        const payload: CreateEventData = {
          target: EventTarget.EAC,
          targetId: certificateId,
          type: event.type,
          description: event.description,
          dates: {
            start: parseDateInput(event.dates.start as string) || new Date(),
            ...(event.dates.end ? { end: parseDateInput(event.dates.end) || new Date() } : {}),
          },
          location: event.location,
          organizations: event.organizations,
          notes: event.notes,
          links: event.links,
        }
        return createEvent(payload)
      })

      await Promise.all(createPromises)
      toast.success(`${validEvents.length} event(s) created successfully`)
      router.push(`/eacertificates/${certificateId}`)
    } catch (error: any) {
      toast.error(error.message ?? 'Failed to create events')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <BackButton />
            <h1 className="text-2xl font-semibold">Create Events for Certificate</h1>
          </div>

          {certificate && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900">Certificate Details</h3>
              <p className="text-sm text-blue-700">
                Type: {certificate.type} | ID: {certificate.id}
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Events</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEvent}
              >
                + Add Event
              </Button>
            </div>

            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-700">Event {index + 1}</h4>
                    {events.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEvent(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type<span className="text-red-600"> *</span></label>
                      <Input 
                        value={event.type} 
                        onChange={e => updateEvent(index, 'type', e.target.value)} 
                        placeholder="e.g., Commissioning, Maintenance, Inspection"
                        required 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <Textarea 
                        value={event.description || ''} 
                        onChange={e => updateEvent(index, 'description', e.target.value)} 
                        placeholder="Describe the event"
                        rows={3} 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DatePicker
                        label="Start date"
                        value={event.dates.start ? parseDateInput(event.dates.start) || undefined : undefined}
                        onChange={(date) => updateEvent(index, 'dates', { 
                          ...event.dates, 
                          start: date ? format(date, 'yyyy-MM-dd') : undefined 
                        })}
                        required
                      />
                      <DatePicker
                        label="End date"
                        value={event.dates.end ? parseDateInput(event.dates.end) || undefined : undefined}
                        onChange={(date) => updateEvent(index, 'dates', { 
                          ...event.dates, 
                          end: date ? format(date, 'yyyy-MM-dd') : undefined 
                        })}
                      />
                    </div>

                    <LocationField 
                      value={event.location as any} 
                      onChange={(v) => updateEvent(index, 'location', v)} 
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <Textarea 
                        value={event.notes || ''} 
                        onChange={e => updateEvent(index, 'notes', e.target.value)} 
                        rows={3} 
                      />
                    </div>

                    <LinksField 
                      value={event.links ?? []} 
                      onChange={(v) => updateEvent(index, 'links', v)} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/eacertificates/${certificateId}`)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={events.every(event => event.type.trim() === '')}
              >
                Create Events
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
