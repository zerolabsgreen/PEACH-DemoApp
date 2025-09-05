'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { listEvents } from '@/lib/services/events'
import { listEACertificates } from '@/lib/services/eacertificates'
import { listProductionSources } from '@/lib/services/production-sources'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BackButton } from '@/components/ui/back-button'

export default function EventsIndexPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [targetLabels, setTargetLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listEvents()
        setEvents(data)

        // Build human-readable labels for targets similar to selector
        try {
          const [certs, sources] = await Promise.all([
            listEACertificates(),
            listProductionSources(),
          ])

          const certMap: Record<string, string> = {}
          for (const c of certs ?? []) {
            certMap[c.id] = `Certificate • ${c.type}`
          }

          const sourceMap: Record<string, string> = {}
          for (const s of sources ?? []) {
            sourceMap[s.id] = `Production Source • ${s.name ?? s.id}`
          }

          const labels: Record<string, string> = {}
          for (const ev of data ?? []) {
            const key = `${ev.target}:${ev.target_id}`
            if (ev.target === 'EAC') labels[key] = certMap[ev.target_id] ?? `${ev.target} • ${ev.target_id}`
            else if (ev.target === 'PSOURCE') labels[key] = sourceMap[ev.target_id] ?? `${ev.target} • ${ev.target_id}`
            else labels[key] = `${ev.target} • ${ev.target_id}`
          }

          setTargetLabels(labels)
        } catch (_) {
          // non-fatal if auxiliary lookups fail
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton href="/dashboard" />
            <h1 className="text-2xl font-semibold">Events</h1>
          </div>
          <Button asChild>
            <Link href="/events/new">New Event</Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link className="text-blue-600 hover:underline" href={`/events/${ev.id}`}>{ev.type}</Link>
                    </td>
                    <td className="px-4 py-2">{targetLabels[`${ev.target}:${ev.target_id}`] ?? ev.target}</td>
                    <td className="px-4 py-2">{ev.dates?.start
                      ? `${new Date(ev.dates.start).toLocaleDateString()}${ev.dates?.end ? ' — ' + new Date(ev.dates.end).toLocaleDateString() : ''}`
                      : '-'}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{ev.updated_at ? new Date(ev.updated_at).toLocaleString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


