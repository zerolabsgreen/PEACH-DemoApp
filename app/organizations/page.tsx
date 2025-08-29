'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { useEffect, useState } from 'react'
import { listOrganizationsWithRole } from '@/lib/services/organizations'
import { Skeleton } from '@/components/ui/skeleton'

export default function OrganizationsIndexPage() {
  const [orgs, setOrgs] = useState<{ organizations: { id: string; name: string } }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setOrgs(await listOrganizationsWithRole())
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
            <h1 className="text-2xl font-semibold">Organizations</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/organizations/new">Create Organization</Link>
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded p-5">
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="bg-white border rounded p-5 hidden md:block">
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
        ) : orgs.length === 0 ? (
          <div className="bg-white border rounded p-6 text-gray-600">No organizations yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgs.map(({ organizations }) => (
              <Link key={organizations.id} href={`/organizations/${organizations.id}`} className="bg-white border rounded p-5 hover:bg-gray-50 block">
                <div className="text-lg font-medium">{organizations.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


