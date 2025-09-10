"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { useEffect, useMemo, useState } from 'react'
import { listOrganizationsWithRole } from '@/lib/services/organizations'
import { Skeleton } from '@/components/ui/skeleton'
import { OrganizationsTable } from '@/components/organizations/OrganizationsTable'
import { countries } from 'countries-list'

export default function OrganizationsIndexPage() {
  const [orgs, setOrgs] = useState<{ organizations: { id: string; name: string; created_at: string; location?: any[] | null } }[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrganizations = async () => {
    try {
      setOrgs(await listOrganizationsWithRole())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  const totals = useMemo(() => {
    const total = orgs.length
    const countryCounts: Record<string, number> = {}
    const countryNames: Record<string, string> = {}
    
    orgs.forEach(({ organizations }) => {
      if (organizations.location && Array.isArray(organizations.location)) {
        organizations.location.forEach((loc: any) => {
          if (loc?.country) {
            const country = String(loc.country).toLowerCase()
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
      }
    })
    
    const uniqueCountries = Object.keys(countryCounts).length
    const top3 = Object.entries(countryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([code, count]) => ({ code, count, name: countryNames[code] }))
    
    return { total, uniqueCountries, top3 }
  }, [orgs])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-2xl font-semibold">Organizations</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/organizations/new">Create Organization</Link>
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
              <div className="text-sm text-gray-500">Total Organizations</div>
              <div className="text-2xl font-semibold">{totals.total}</div>
            </div>
            <div className="bg-white border rounded p-5">
              <div className="text-sm text-gray-500">Countries</div>
              <div className="text-2xl font-semibold">{totals.uniqueCountries}</div>
            </div>
            {totals.top3.length > 0 && (
              <div className="bg-white border rounded p-5">
                <div className="text-sm text-gray-500 mb-2">Top Countries</div>
                <div className="space-y-1">
                  {totals.top3.map(({ name, count }, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {totals.top3.length === 0 && (
              <div className="bg-white border rounded p-5">
                <div className="text-sm text-gray-500">Top Countries</div>
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
        ) : orgs.length === 0 ? (
          <div className="bg-white border rounded p-6 text-center">
            <div className="text-gray-600 mb-4">No organizations yet.</div>
            <Button asChild>
              <Link href="/organizations/new">Create your first organization</Link>
            </Button>
          </div>
        ) : (
          <OrganizationsTable data={orgs.map(({ organizations }) => ({ id: organizations.id, name: organizations.name, created_at: organizations.created_at }))} onDelete={loadOrganizations} />
        )}
    </div>
  )
}


