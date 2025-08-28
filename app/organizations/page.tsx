'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { listOrganizationsWithRole } from '@/lib/services/organizations'

export default function OrganizationsIndexPage() {
  const [orgs, setOrgs] = useState<{ role: 'admin' | 'member'; organizations: { id: string; name: string } }[]>([])
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
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back</Link>
            </Button>
            <Button asChild>
              <Link href="/organizations/new">Create Organization</Link>
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="text-gray-600">Loading...</div>
        ) : orgs.length === 0 ? (
          <div className="bg-white border rounded p-6 text-gray-600">No organizations yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgs.map(({ organizations, role }) => (
              <div key={organizations.id} className="bg-white border rounded p-5">
                <div className="text-lg font-medium">{organizations.name}</div>
                <div className="text-sm text-gray-500">Role: {role}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


