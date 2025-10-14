'use client'

import Link from 'next/link'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { getEvent, deleteEvent } from '@/lib/services/events'
import { getDocumentsByIds } from '@/lib/services/documents'
import { useAuth } from '@/lib/auth-context'
import { formatDate } from '@/lib/date-utils'

interface EventPageProps { params: Promise<{ id: string }> }

export default function EventPage({ params }: EventPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const [ev, setEv] = useState<any | null>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getEvent(id)
        setEv(data)
        const ids = (data.documents ?? []) as string[]
        if (ids.length > 0) {
          const d = await getDocumentsByIds(ids)
          setDocs(d)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteEvent(id)
      router.push('/events')
    } finally {
      setDeleting(false)
      setOpenDelete(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white shadow rounded-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>

            <div className="space-y-6">
              {/* Basic Information Section */}
              <section>
                <Skeleton className="h-6 w-16 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-12 mb-2" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-12 mb-2" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-8 mb-2" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </section>

              {/* Description Section */}
              <section>
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </section>

              {/* Location Section */}
              <section>
                <Skeleton className="h-6 w-20 mb-4" />
                <div className="bg-gray-50 p-3 rounded">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-2" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </section>

              {/* Links Section */}
              <section>
                <Skeleton className="h-6 w-12 mb-4" />
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </section>

              {/* Notes Section */}
              <section>
                <Skeleton className="h-6 w-12 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </section>

              {/* Documents Section */}
              <section>
                <Skeleton className="h-6 w-20 mb-4" />
                <div className="space-y-3">
                  <div className="border rounded p-3">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="border rounded p-3">
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!ev) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BackButton />
              <h1 className="text-2xl font-semibold">{ev.type}</h1>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link href={`/events/${id}/edit`}>Edit</Link></Button>
              <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this event? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Deleting…' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-medium mb-2">Basic</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Target</div>
                  <div className="font-medium">{ev.target}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Target Id</div>
                  <div className="font-mono text-sm">{ev.target_id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Start</div>
                  <div>{formatDate(ev.dates?.start)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">End</div>
                  <div>{formatDate(ev.dates?.end)}</div>
                </div>
              </div>
            </section>

            {ev.description && (
              <section>
                <h2 className="text-lg font-medium mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{ev.description}</p>
              </section>
            )}

            {ev.location && (
              <section>
                <h2 className="text-lg font-medium mb-2">Location</h2>
                <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">{JSON.stringify(ev.location, null, 2)}</pre>
              </section>
            )}

            {ev.links && ev.links.length > 0 && (
              <section>
                <h2 className="text-lg font-medium mb-2">Links</h2>
                <ul className="list-disc pl-6">
                  {ev.links.map((l: string, i: number) => (
                    <li key={i}><a className="text-blue-600 hover:underline" href={l} target="_blank" rel="noreferrer">{l}</a></li>
                  ))}
                </ul>
              </section>
            )}

            {ev.metadata && ev.metadata.length > 0 && (
              <section>
                <h2 className="text-lg font-medium mb-2">Metadata</h2>
                <div className="space-y-2">
                  {ev.metadata.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">{item.label || item.key}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                        )}
                        <div className="text-sm text-gray-700 mt-1">{item.value || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {ev.notes && (
              <section>
                <h2 className="text-lg font-medium mb-2">Notes</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{ev.notes}</p>
              </section>
            )}

            <section>
              <h2 className="text-lg font-medium mb-2">Documents</h2>
              {docs.length === 0 ? (
                <div className="text-sm text-gray-500">No documents</div>
              ) : (
                <div className="space-y-2">
                  {docs.map((d) => (
                    <div key={d.id} className="border rounded p-3">
                      <div className="font-medium">{d.title ?? d.file_type}</div>
                      <a className="text-blue-600 hover:underline text-sm" href={d.url} target="_blank" rel="noreferrer">Open</a>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}


