'use client'

import Link from 'next/link'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
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

interface EventPageProps { params: Promise<{ id: string }> }

export default function EventPage({ params }: EventPageProps) {
  const { id } = use(params)
  const router = useRouter()
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

  if (loading) {
    return <div className="p-6">Loading…</div>
  }

  if (!ev) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BackButton href="/events" />
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
                  <div>{ev.dates?.start ? new Date(ev.dates.start).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">End</div>
                  <div>{ev.dates?.end ? new Date(ev.dates.end).toLocaleDateString() : '-'}</div>
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


