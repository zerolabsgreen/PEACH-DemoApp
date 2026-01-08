'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { useEffect, useState, useMemo } from 'react'
import { listProductionSources, type ProductionSource } from '@/lib/services/production-sources'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductionSourcesTable } from '@/components/production-sources/ProductionSourcesTable'
import type { ProductionSourceRow } from '@/components/production-sources/ProductionSourcesColumns'
import { countries } from 'countries-list'

export default function ProductionSourcesIndexPage() {
  const [sources, setSources] = useState<ProductionSource[]>([])
  const [loading, setLoading] = useState(true)

  const loadSources = async () => {
    try {
      setSources(await listProductionSources())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
  }, [])

  const totals = useMemo(() => {
    const total = sources.length
    const countryCounts: Record<string, number> = {}
    const countryNames: Record<string, string> = {}
    const technologyCounts: Record<string, number> = {}
    
    sources.forEach((source) => {
      // Count technologies (now an array)
      if (source.technology && Array.isArray(source.technology)) {
        source.technology.forEach(tech => {
          technologyCounts[tech] = (technologyCounts[tech] || 0) + 1
        })
      }
      
      // Count countries from location data
      if (source.location && source.location.country) {
        const country = String(source.location.country).toLowerCase()
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
    
    const top3Technologies = Object.entries(technologyCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tech, count]) => ({ tech, count }))
    
    return { total, uniqueCountries, top3Countries, top3Technologies }
  }, [sources])

  const tableData: ProductionSourceRow[] = sources.map(source => ({
    id: source.id,
    name: source.name,
    technology: source.technology,
    description: source.description,
    created_at: source.created_at,
  }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-2xl font-semibold">Production Sources</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/production-sources/new">Create Production Source</Link>
          </Button>
        </div>
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
              <div className="text-sm text-gray-500">Total Production Sources</div>
              <div className="text-2xl font-semibold">{totals.total}</div>
            </div>
            <div className="bg-white border rounded p-5">
              <div className="text-sm text-gray-500">Countries</div>
              <div className="text-2xl font-semibold">{totals.uniqueCountries}</div>
            </div>
            {totals.top3Technologies.length > 0 && (
              <div className="bg-white border rounded p-5">
                <div className="text-sm text-gray-500 mb-2">Top Technologies</div>
                <div className="space-y-1">
                  {totals.top3Technologies.map(({ tech, count }, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{tech}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {totals.top3Countries.length > 0 && (
              <div className="bg-white border rounded p-5">
                <div className="text-sm text-gray-500 mb-2">Top Countries</div>
                <div className="space-y-1">
                  {totals.top3Countries.map(({ name, count }, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {totals.top3Technologies.length === 0 && totals.top3Countries.length === 0 && (
              <div className="bg-white border rounded p-5">
                <div className="text-sm text-gray-500">Top Technologies</div>
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
        ) : sources.length === 0 ? (
          <div className="bg-white border rounded p-6 text-center">
            <div className="text-gray-600 mb-4">No production sources yet.</div>
            <Button asChild>
              <Link href="/production-sources/new">Create your first production source</Link>
            </Button>
          </div>
        ) : (
          <ProductionSourcesTable 
            data={tableData} 
            sourcesWithLocation={sources.map(s => ({ id: s.id, location: s.location }))}
            onDelete={loadSources}
          />
        )}
    </div>
  )
}
