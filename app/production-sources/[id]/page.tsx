'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getProductionSource, deleteProductionSource } from '@/lib/services/production-sources'
import { toast } from 'sonner'
import { formatDate, formatDateTime } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FILE_TYPE_NAMES, FileType } from '@/lib/types/eacertificate'
import { createClientComponentClient } from '@/lib/supabase'
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
import type { ProductionSourceDB } from '@/lib/types/eacertificate'
import { listEventsByTarget } from '@/lib/services/events'
import { EventTarget } from '@/lib/types/eacertificate'
import DocumentManager from '@/components/documents/DocumentManager'

export default function ProductionSourceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [source, setSource] = useState<ProductionSourceDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [documentIds, setDocumentIds] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProductionSource(id)
        setSource(data)
        setDocumentIds(data.documents || [])
        
        // Load documents using the production source's documents array
        if (data && data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
          const supabase = createClientComponentClient()
          const { data: docs } = await supabase
            .from('documents')
            .select('id, url, file_type, title, description, organizations, updated_at, created_at')
            .in('id', data.documents)
            .order('updated_at', { ascending: false })
          setDocuments(docs || [])
        } else {
          setDocuments([])
        }
        // Load related events
        try {
          const evs = await listEventsByTarget(EventTarget.PSOURCE, id)
          setEvents(evs)
        } catch (_) {}
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to load production source')
        router.push('/production-sources')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteProductionSource(id)
      toast.success('Production source deleted')
      router.push('/production-sources')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete production source')
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-2 mb-6">
            <BackButton />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="bg-white border rounded p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="bg-white border rounded p-6 space-y-4 mt-6">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!source) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-2xl font-semibold">
              {source.name || 'Unnamed Production Source'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push(`/production-sources/${id}/edit`)}
            >
              Edit
            </Button>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Production Source</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this production source? This action cannot be undone.
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

        <div className="bg-white border rounded p-6 space-y-6">
          {source.name && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Name</h2>
              <p className="text-gray-700">{source.name}</p>
            </div>
          )}

          {source.description && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
              <p className="text-gray-700">{source.description}</p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Technology</h2>
            <p className="text-gray-700">{source.technology}</p>
          </div>

          {source.location && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Location</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                {source.location.country && (
                  <div>
                    <span className="font-medium">Country:</span> {source.location.country}
                  </div>
                )}
                {source.location.subdivision && (
                  <div>
                    <span className="font-medium">State/Province:</span> {source.location.subdivision}
                  </div>
                )}
                {source.location.region && (
                  <div>
                    <span className="font-medium">Region:</span> {source.location.region}
                  </div>
                )}
                {source.location.zipCode && (
                  <div>
                    <span className="font-medium">ZIP Code:</span> {source.location.zipCode}
                  </div>
                )}
                {source.location.address && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Address:</span> {source.location.address}
                  </div>
                )}
                {source.location.latitude !== undefined && (
                  <div>
                    <span className="font-medium">Latitude:</span> {source.location.latitude}
                  </div>
                )}
                {source.location.longitude !== undefined && (
                  <div>
                    <span className="font-medium">Longitude:</span> {source.location.longitude}
                  </div>
                )}
                {source.location.geoBounds && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Geospatial Bounds:</span> {source.location.geoBounds}
                  </div>
                )}
              </div>
            </div>
          )}

          {source.links && source.links.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Links</h2>
              <div className="space-y-1">
                {source.links.map((link, index) => (
                  <a 
                    key={index} 
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 block"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          {source.external_ids && source.external_ids.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">External Identifiers</h2>
              <div className="space-y-3">
                {source.external_ids.map((eid, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><span className="font-medium">ID:</span> {eid.id}</div>
                      {eid.externalFieldName && (
                        <div><span className="font-medium">Field:</span> {eid.externalFieldName}</div>
                      )}
                      {eid.ownerOrgId && (
                        <div><span className="font-medium">Owner Org ID:</span> {eid.ownerOrgId}</div>
                      )}
                      {eid.ownerOrgName && (
                        <div><span className="font-medium">Owner Org Name:</span> {eid.ownerOrgName}</div>
                      )}
                      {eid.description && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Description:</span> {eid.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {source.related_production_sources && source.related_production_sources.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Related Production Sources</h2>
              <div className="space-y-1">
                {source.related_production_sources.map((id, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    <span className="font-medium">ID:</span> {id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {source.metadata && source.metadata.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Metadata</h2>
              <div className="space-y-2">
                {source.metadata.map((item, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    <span className="font-medium">{item.label || item.key}:</span> {item.value}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500">
            <div>Created: {formatDate(source.created_at)}</div>
            <div>Updated: {formatDate(source.updated_at)}</div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white border rounded p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Documents</div>
            <DocumentManager
              entityType="production-sources"
              entityId={id}
              currentDocumentIds={documentIds}
              onDocumentsChange={(newIds) => {
                setDocumentIds(newIds)
                // Reload documents to reflect changes
                const loadDocs = async () => {
                  const supabase = createClientComponentClient()
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
            <div className="text-sm text-gray-600">No documents for this production source yet.</div>
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
                        <a href={d.url} target="_blank" rel="noreferrer">View</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Events Section */}
        <div className="bg-white border rounded p-6 space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Events</div>
            <Button asChild size="sm">
              <a href={`/events/new?target=PSOURCE&targetId=${id}`}>Add event</a>
            </Button>
          </div>
          {events.length === 0 ? (
            <div className="text-sm text-gray-600">No events for this production source yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev: any) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium"><a className="text-blue-600 hover:underline" href={`/events/${ev.id}`}>{ev.type}</a></TableCell>
                    <TableCell>{formatDate(ev.dates?.start)}</TableCell>
                    <TableCell>{formatDateTime(ev.updated_at || ev.created_at)}</TableCell>
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
