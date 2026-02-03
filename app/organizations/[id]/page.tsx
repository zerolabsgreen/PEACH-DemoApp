'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getSupabase, deleteOrganization } from '@/lib/services/organizations'
import { formatDateTime } from '@/lib/date-utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FILE_TYPE_NAMES, FileType, OrganizationRole } from '@/lib/types/eacertificate'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import DocumentManager from '@/components/documents/DocumentManager'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'

export default function ViewOrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [documentIds, setDocumentIds] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, url, description, contacts, location, documents, external_ids')
        .eq('id', orgId)
        .single()
      if (!error) {
        setOrg(data)
        setDocumentIds(data.documents || [])
      }

      // Load documents using the organization's documents array
      if (data && data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('id, url, file_type, title, description, organizations, updated_at, created_at')
          .in('id', data.documents)
          .order('updated_at', { ascending: false })
        setDocuments(docs || [])
      } else {
        setDocuments([])
      }
      setLoading(false)
    }
    if (orgId) load()
  }, [orgId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteOrganization(orgId)
      toast.success('Organization deleted')
      router.push('/organizations')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete organization')
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const location = Array.isArray(org?.location) && org.location.length ? org.location[0] : {}

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-2xl font-semibold">Organization</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/organizations/${orgId}/edit`}>Edit</Link>
            </Button>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this organization? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {loading || !org ? (
          <div className="space-y-6">
            <div className="bg-white border rounded p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-28" />
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
            <div className="bg-white border rounded p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          </div>
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
                <Input value={org.contacts ?? ''} readOnly disabled />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <Textarea value={org.description ?? ''} readOnly disabled rows={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
                <Input
                  value={location?.country ?? ''}
                  placeholder={location?.country ? undefined : 'Country'}
                  readOnly
                  disabled
                />
                <Input
                  value={location?.state ?? ''}
                  placeholder={location?.state ? undefined : 'State'}
                  readOnly
                  disabled
                />
                <Input
                  value={location?.region ?? ''}
                  placeholder={location?.region ? undefined : 'Region'}
                  readOnly
                  disabled
                />
                <Input
                  value={location?.zipCode ?? ''}
                  placeholder={location?.zipCode ? undefined : 'ZIP Code'}
                  readOnly
                  disabled
                />
                <Input
                  value={location?.address ?? ''}
                  placeholder={location?.address ? undefined : 'Address'}
                  readOnly
                  disabled
                />
                {location?.latitude !== undefined && (
                  <Input value={location.latitude.toString()} placeholder="Latitude" readOnly disabled />
                )}
                {location?.longitude !== undefined && (
                  <Input value={location.longitude.toString()} placeholder="Longitude" readOnly disabled />
                )}
                {location?.geoBounds && (
                  <Input
                    value={location.geoBounds}
                    placeholder="Geospatial Bounds"
                    readOnly
                    disabled
                    className="md:col-span-3"
                  />
                )}
              </div>
            </div>

            {org.external_ids && org.external_ids.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">External Identifiers</label>
                <div className="space-y-3">
                  {org.external_ids.map((externalId: any, index: number) => (
                    <div key={index} className="border rounded p-3 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">ID</label>
                          <Input value={externalId.id || ''} readOnly disabled className="bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Field Name</label>
                          <Input value={externalId.externalFieldName || ''} readOnly disabled className="bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Owner Organization</label>
                          <Input value={externalId.ownerOrgName || ''} readOnly disabled className="bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Description</label>
                          <Input value={externalId.description || ''} readOnly disabled className="bg-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white border rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Documents</div>
            <DocumentManager
              entityType="organizations"
              entityId={orgId}
              currentDocumentIds={documentIds}
              onDocumentsChange={newIds => {
                setDocumentIds(newIds)
                // Reload documents to reflect changes
                const loadDocs = async () => {
                  const supabase = getSupabase()
                  if (newIds.length > 0) {
                    const { data: docs } = await supabase
                      .from('documents')
                      .select('id, url, file_type, title, description, organizations, updated_at, created_at')
                      .in('id', newIds)
                      .order('updated_at', { ascending: false })
                    setDocuments(docs || [])
                  } else {
                    setDocuments([])
                  }
                }
                loadDocs()
              }}
            />
          </div>
          {documents.length === 0 ? (
            <div className="text-sm text-gray-600">No documents for this organization yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title || '—'}</TableCell>
                    <TableCell>{FILE_TYPE_NAMES[d.file_type as FileType] || d.file_type}</TableCell>
                    <TableCell className="hidden md:table-cell">{d.description || '—'}</TableCell>
                    <TableCell>{formatDateTime(d.updated_at || d.created_at)}</TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <a href={d.url} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
