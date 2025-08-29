'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganizationFull } from '@/lib/services/organizations'
import { uploadAndCreateDocument } from '@/lib/services/documents'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import DocumentUploader from '@/components/documents/DocumentUploader'
import ExternalIdField from '@/components/external-id/ExternalIdField'
import { OrganizationRole } from '@/lib/types/eacertificate'
let countryNames: string[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { countries } = require('countries-list') as any
  countryNames = Object.values(countries).map((c: any) => c.name).sort()
} catch (_) {
  countryNames = []
}

export default function NewOrganizationPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    url: '',
    description: '',
    contact: '',
    location: { country: '', city: '', state: '', address: '', postalCode: '' } as any,
    documents: [] as any[],
    externalIDs: [] as any[],
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-2xl font-semibold">Create Organization</h1>
          </div>
        </div>
        <form
          className="space-y-6 bg-white border rounded p-6"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              const org = await createOrganizationFull(form)
              const docs = Array.isArray(form.documents) ? form.documents : []
              if (docs.length > 0) {
                await Promise.all(
                  docs.map(async (item: any) => {
                    if (!item?.file) return
                    await uploadAndCreateDocument({
                      file: item.file,
                      fileName: item.file.name,
                      fileType: item.fileType,
                      title: item.title,
                      description: item.description,
                      metadata: item.metadata,
                      organizations: [{ orgId: org.id, role: 'owner', orgName: org.name }],
                    })
                  })
                )
              }
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
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <div className="grid grid-cols-12 gap-4 mt-2">
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs text-gray-500 mb-1">Country<span className="text-red-600"> *</span></label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {form.location.country || 'Select a country'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                    <Command>
                      <CommandInput placeholder="Search country..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {countryNames.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={() => set('location', { ...form.location, country: name })}
                            >
                              {name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input className="sr-only" tabIndex={-1} value={form.location.country} onChange={() => {}}
                  required aria-hidden="true" />
              </div>
              <div className="col-span-12 md:col-span-6">
                <label className="block text-xs text-gray-500 mb-1">State/Region</label>
                <Input placeholder="State/Region" value={form.location.state} onChange={e => set('location', { ...form.location, state: e.target.value })} />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs text-gray-500 mb-1">City</label>
                <Input placeholder="City" value={form.location.city} onChange={e => set('location', { ...form.location, city: e.target.value })} />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs text-gray-500 mb-1">Postal Code</label>
                <Input placeholder="Postal Code" value={form.location.postalCode} onChange={e => set('location', { ...form.location, postalCode: e.target.value })} />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <Input placeholder="Address" value={form.location.address} onChange={e => set('location', { ...form.location, address: e.target.value })} />
              </div>
            </div>
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
            <Button disabled={saving}>{saving ? 'Creating...' : 'Create Organization'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}


