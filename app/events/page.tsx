'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { listEvents } from '@/lib/services/events'
import { listEACertificates } from '@/lib/services/eacertificates'
import { listProductionSources } from '@/lib/services/production-sources'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BackButton } from '@/components/ui/back-button'
import { EventsTable } from '@/components/events/EventsTable'
import type { EventRow } from '@/components/events/EventsColumns'
import { countries } from 'countries-list'

export default function EventsIndexPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [targetLabels, setTargetLabels] = useState<Record<string, string>>({})

  const loadEvents = async () => {
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

  useEffect(() => {
    loadEvents()
  }, [])

  const totals = useMemo(() => {
    const total = events.length
    const countryCounts: Record<string, number> = {}
    const countryNames: Record<string, string> = {}
    const typeCounts: Record<string, number> = {}
    const targetCounts: Record<string, number> = {}
    
    events.forEach((event) => {
      // Count types
      if (event.type) {
        typeCounts[event.type] = (typeCounts[event.type] || 0) + 1
      }
      
      // Count targets
      if (event.target) {
        targetCounts[event.target] = (targetCounts[event.target] || 0) + 1
      }
      
      // Count countries from location data
      if (event.location && event.location.country) {
        const country = String(event.location.country).toLowerCase()
        countryCounts[country] = (countryCounts[country] || 0) + 1
        // Try to find the country name from the code
        if (!countryNames[country]) {
          const found = Object.entries(countries).find(([code, meta]: any) => 
            code.toLowerCase() === country || meta.name.toLowerCase() === country
          )
          countryNames[country] = found ? found[1].name : country
        }
      }
    })
    
    const uniqueCountries = Object.keys(countryCounts).length
    const top3Countries = Object.entries(countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([code, count]) => ({ code, count, name: countryNames[code] }))
    
    const top3Types = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }))
    
    const top3Targets = Object.entries(targetCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([target, count]) => ({ target, count }))
    
    return { total, uniqueCountries, top3Countries, top3Types, top3Targets }
  }, [events])

  const tableData: EventRow[] = events.map(event => ({
    id: event.id,
    type: event.type,
    target: event.target,
    target_id: event.target_id,
    dates: event.dates,
    location: event.location,
    created_at: event.created_at,
    updated_at: event.updated_at,
  }))

  return (
    <div className="p-6">
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded p-5"><Skeleton className="h-6 w-24" /></div>
            <div className="bg-white border rounded p-5 hidden md:block"><Skeleton className="h-6 w-24" /></div>
            <div className="bg-white border rounded p-5 hidden md:block"><Skeleton className="h-6 w-24" /></div>
            <div className="bg-white border rounded p-5 hidden md:block"><Skeleton className="h-6 w-24" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded p-5">
              <div className="text-sm text-gray-500">Total Events</div>
              <div className="text-2xl font-semibold">{totals.total}</div>
            </div>
            <div className="bg-white border rounded p-5">
              <div className="text-sm text-gray-500">Countries</div>
              <div className="text-2xl font-semibold">{totals.uniqueCountries}</div>
            </div>
            {totals.top3Types.length > 0 && (
              <div className="bg-white border rounded p-5">
                <div className="text-sm text-gray-500 mb-2">Top Types</div>
                <div className="space-y-1">
                  {totals.top3Types.map(({ type, count }, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{type}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {totals.top3Targets.length > 0 && (
              <div className="bg-white border rounded p-5">
                <div className="text-sm text-gray-500 mb-2">Top Targets</div>
                <div className="space-y-1">
                  {totals.top3Targets.map(({ target, count }, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{target}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {totals.top3Types.length === 0 && totals.top3Targets.length === 0 && (
              <div className="bg-white border rounded p-5">
                <div className="text-sm text-gray-500">Top Types</div>
                <div className="text-lg text-gray-400 mt-1">No data</div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white border rounded p-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full mt-2" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border rounded p-6 text-center">
            <div className="text-gray-600 mb-4">No events yet.</div>
            <Button asChild>
              <Link href="/events/new">Create your first event</Link>
            </Button>
          </div>
        ) : (
          <EventsTable data={tableData} targetLabels={targetLabels} onDelete={loadEvents} />
        )}
    </div>
  )
}


