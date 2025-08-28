'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getSupabase } from '@/lib/services/organizations'
import Link from 'next/link'

export default function ViewOrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, url, description, contact, location')
        .eq('id', orgId)
        .single()
      if (!error) setOrg(data)

      setMembers([])
      setLoading(false)
    }
    if (orgId) load()
  }, [orgId])

  const location = Array.isArray(org?.location) && org.location.length ? org.location[0] : {}

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-2xl font-semibold">Organization</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild><Link href={`/organizations/${orgId}/edit`}>Edit</Link></Button>
          </div>
        </div>

        {loading || !org ? (
          <div className="text-gray-600">Loading...</div>
        ) : (
          <div className="bg-white border rounded p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <Input value={org.name ?? ''} readOnly disabled />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Website URL</label>
                <Input value={org.url ?? ''} readOnly disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact</label>
                <Input value={org.contact ?? ''} readOnly disabled />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <Textarea value={org.description ?? ''} readOnly disabled rows={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-1">
                <Input value={location?.country ?? ''} readOnly disabled />
                <Input value={location?.state ?? ''} readOnly disabled />
                <Input value={location?.city ?? ''} readOnly disabled />
                <Input value={location?.postalCode ?? ''} readOnly disabled />
                <Input value={location?.address ?? ''} readOnly disabled />
              </div>
            </div>
          </div>
        )}

        {/* Members feature removed for now */}
      </div>
    </div>
  )
}


