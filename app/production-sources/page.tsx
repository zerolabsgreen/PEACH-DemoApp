'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { useEffect, useState } from 'react'
import { listProductionSources, type ProductionSource } from '@/lib/services/production-sources'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProductionSourcesIndexPage() {
  const [sources, setSources] = useState<ProductionSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setSources(await listProductionSources())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton href="/dashboard" />
            <h1 className="text-2xl font-semibold">Production Sources</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/production-sources/new">Create Production Source</Link>
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded p-5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
            <div className="bg-white border rounded p-5 hidden md:block">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          </div>
        ) : sources.length === 0 ? (
          <div className="bg-white border rounded p-6 text-gray-600">No production sources yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((source) => (
              <Link key={source.id} href={`/production-sources/${source.id}`} className="bg-white border rounded p-5 hover:bg-gray-50 block">
                <div className="text-lg font-medium">{source.name || 'Unnamed Source'}</div>
                <div className="text-sm text-gray-600 mt-1">{source.technology}</div>
                {source.description && (
                  <div className="text-sm text-gray-500 mt-2 line-clamp-2">{source.description}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
