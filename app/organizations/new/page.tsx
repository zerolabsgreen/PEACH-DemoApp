'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganizationFull } from '@/lib/services/organizations'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function NewOrganizationPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
    contacts: '',
    external_ids: [] as { system: string; id: string }[],
    location: { country: '', city: '', address: '' } as any,
    documents: [] as any[],
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Create Organization</h1>
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
        </div>
        <form
          className="space-y-6 bg-white border rounded p-6"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              await createOrganizationFull(form)
              toast.success('Organization created')
              router.push('/organizations')
            } catch (e: any) {
              toast.error(e.message ?? 'Failed to create organization')
            } finally {
              setSaving(false)
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Website URL</label>
              <input value={form.url} onChange={e => set('url', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contacts</label>
              <input value={form.contacts} onChange={e => set('contacts', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" rows={4} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
              <input placeholder="Country" value={form.location.country} onChange={e => set('location', { ...form.location, country: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="City" value={form.location.city} onChange={e => set('location', { ...form.location, city: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="Address" value={form.location.address} onChange={e => set('location', { ...form.location, address: e.target.value })} className="border rounded px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">External IDs</label>
            <div className="space-y-2 mt-1">
              {form.external_ids.map((x, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input placeholder="System" value={x.system} onChange={e => {
                    const a = [...form.external_ids]; a[i] = { ...a[i], system: e.target.value }; set('external_ids', a)
                  }} className="border rounded px-3 py-2" />
                  <input placeholder="ID" value={x.id} onChange={e => {
                    const a = [...form.external_ids]; a[i] = { ...a[i], id: e.target.value }; set('external_ids', a)
                  }} className="border rounded px-3 py-2" />
                </div>
              ))}
              <button type="button" onClick={() => set('external_ids', [...form.external_ids, { system: '', id: '' }])} className="text-sm px-3 py-1 bg-gray-200 rounded">Add External ID</button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/organizations')}>Cancel</Button>
            <Button disabled={saving}>{saving ? 'Creating...' : 'Create Organization'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}


