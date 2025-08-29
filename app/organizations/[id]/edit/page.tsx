'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { getSupabase } from '@/lib/services/organizations'
import DocumentUploader from '@/components/documents/DocumentUploader'
import { OrganizationRole } from '@/lib/types/eacertificate'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import { Skeleton } from '@/components/ui/skeleton'

export default function EditOrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
    contact: '',
    location: { country: '', state: '', city: '', postalCode: '', address: '' } as any,
    documents: [] as any[],
    externalIDs: [] as any[],
  })

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, url, description, contact, location, external_ids')
          .eq('id', orgId)
          .single()
        if (error) throw error
        const loc = Array.isArray(data.location) && data.location.length ? data.location[0] : {}
        setForm({
          name: data.name ?? '',
          url: data.url ?? '',
          description: data.description ?? '',
          contact: data.contact ?? '',
          location: {
            country: loc?.country ?? '',
            state: loc?.state ?? '',
            city: loc?.city ?? '',
            postalCode: loc?.postalCode ?? '',
            address: loc?.address ?? '',
          },
          documents: [],
          externalIDs: Array.isArray(data.external_ids) ? data.external_ids : [],
        })
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to load organization')
      } finally {
        setLoading(false)
      }
    }
    if (orgId) load()
  }, [orgId])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton href={`/organizations/${orgId}`} />
            <h1 className="text-2xl font-semibold">Edit Organization</h1>
          </div>
        </div>
        {loading ? (
          <div className="bg-white border rounded p-6 space-y-6">
            <Skeleton className="h-6 w-56" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-28" />
            <Skeleton className="h-6 w-56" />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        ) : (
          <form
            className="space-y-6 bg-white border rounded p-6"
            onSubmit={async (e) => {
              e.preventDefault()
              setSaving(true)
              try {
                const supabase = getSupabase()
                const payload: any = {
                  name: form.name,
                  url: form.url || null,
                  description: form.description || null,
                  contact: form.contact || null,
                  location: [form.location],
                  external_ids: Array.isArray(form.externalIDs) ? form.externalIDs : null,
                }
                const { error } = await supabase
                  .from('organizations')
                  .update(payload)
                  .eq('id', orgId)
                if (error) throw error
                toast.success('Changes saved')
                router.push('/organizations')
              } catch (e: any) {
                toast.error(e.message ?? 'Failed to save changes')
              } finally {
                setSaving(false)
              }
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">Name<span className="text-red-600"> *</span></label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Corp" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Website URL</label>
                <Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://example.com" type="url" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact</label>
                <Input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="contact@example.com, +1 555 555 5555" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief overview of the organization" rows={4} />
            </div>
            <div>
              <ExternalIdField
                value={form.externalIDs}
                onChange={(v) => set('externalIDs', v)}
                label="External identifiers"
                description="Link this organization to external systems. Only ID is required."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-1">
                <Input placeholder="Country *" value={form.location.country} onChange={e => set('location', { ...form.location, country: e.target.value })} required />
                <Input placeholder="State/Region" value={form.location.state} onChange={e => set('location', { ...form.location, state: e.target.value })} />
                <Input placeholder="City" value={form.location.city} onChange={e => set('location', { ...form.location, city: e.target.value })} />
                <Input placeholder="Postal Code" value={form.location.postalCode} onChange={e => set('location', { ...form.location, postalCode: e.target.value })} />
                <Input placeholder="Address" value={form.location.address} onChange={e => set('location', { ...form.location, address: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Documents</label>
              <div className="mt-2">
                <DocumentUploader
                  defaultOrganizations={[] as OrganizationRole[]}
                  onChange={(items) => set('documents', items)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/organizations')}>Cancel</Button>
              <Button disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}


