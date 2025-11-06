'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getEACertificate, deleteEACertificate } from '@/lib/services/eacertificates'
import { EAC_TYPE_NAMES, FILE_TYPE_NAMES, type EACertificateDB, FileType } from '@/lib/types/eacertificate'
import { use } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listEventsByTarget } from '@/lib/services/events'
import { getProductionSource } from '@/lib/services/production-sources'
import { EventTarget } from '@/lib/types/eacertificate'
import DocumentManager from '@/components/documents/DocumentManager'
import { useAuth } from '@/lib/auth-context'
import { formatDate, formatDateTime } from '@/lib/date-utils'

interface EACertificatePageProps {
  params: Promise<{ id: string }>
}

export default function EACertificatePage({ params }: EACertificatePageProps) {
  const router = useRouter()
  const { id } = use(params)
  const { loading: authLoading } = useAuth()
  const [certificate, setCertificate] = useState<EACertificateDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [productionSourceName, setProductionSourceName] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getEACertificate(id)
        setCertificate(data)
        // Load production source name if available
        if (data?.production_source_id) {
          try {
            const ps = await getProductionSource(data.production_source_id)
            // @ts-ignore - name may be null
            setProductionSourceName(ps?.name ?? null)
          } catch (e) {
            // ignore if not accessible
          }
        }
        setDocumentIds(data.documents || [])
        
        if (data && data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
          console.log('Certificate documents array:', data.documents)
          const supabase = createClientComponentClient()
          
          // Try to fetch documents by ID
          console.log('Querying documents table with IDs:', data.documents)
          
          // First, let's check if the document exists at all
          for (const docId of data.documents) {
            const { data: singleDoc, error: singleError } = await supabase
              .from('documents')
              .select('*')
              .eq('id', docId)
              .single()
            
            if (singleError) {
              console.error(`Error fetching document ${docId}:`, singleError)
            } else {
              console.log(`Document ${docId} found:`, singleDoc)
            }
          }
          
          // Now try the original query
          const { data: docs, error: docsError } = await supabase
            .from('documents')
            .select('id, url, file_type, title, description, organizations, updated_at, created_at')
            .in('id', data.documents)
            .order('updated_at', { ascending: false })
          
          if (docsError) {
            console.error('Error fetching documents:', docsError)
          } else {
            console.log('Fetched documents:', docs)
            console.log('Number of documents found:', docs?.length || 0)
          }
          
          // Let's also check what's in the documents table in general
          const { data: allDocs, error: allDocsError } = await supabase
            .from('documents')
            .select('id, url, file_type, title')
            .limit(5)
          
          if (allDocsError) {
            console.error('Error fetching all documents:', allDocsError)
          } else {
            console.log('Sample of documents in table:', allDocs)
            console.log('Total documents in table:', allDocs?.length || 0)
          }
          
          // Let's also try to find the specific document by its exact UUID
          const specificDocId = data.documents[0]
          console.log('Looking for specific document with ID:', specificDocId)
          
          const { data: specificDoc, error: specificError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', specificDocId)
            .maybeSingle()
          
          if (specificError) {
            console.error('Error fetching specific document:', specificError)
          } else if (specificDoc) {
            console.log('Specific document found:', specificDoc)
          } else {
            console.log('Specific document NOT found - this is the problem!')
          }
          
          setDocuments(docs || [])
        } else {
          console.log('No documents array or empty array in certificate')
          console.log('Data type:', typeof data?.documents)
          console.log('Data value:', data?.documents)
          setDocuments([])
        }

        // Load related events
        try {
          const evs = await listEventsByTarget(EventTarget.EAC, id)
          setEvents(evs)
        } catch (e) {
          // ignore
        }
        
        // Set loading to false only after all data is loaded
        setLoading(false)
      } catch (error) {
        console.error('Failed to load certificate:', error)
        // You might want to show an error message here
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      await deleteEACertificate(id)
      router.push('/eacertificates')
    } catch (error) {
      console.error('Failed to delete certificate:', error)
      // You might want to show an error message here
    } finally {
      setDeleting(false)
    }
  }

  if (loading || authLoading) {
    console.log('Certificate page loading state:', { loading, authLoading })
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
              {/* Basic Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Skeleton className="h-6 w-32 mb-3" />
                  <div className="space-y-3">
                    <div>
                      <Skeleton className="h-4 w-12 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </div>

                <div>
                  <Skeleton className="h-6 w-20 mb-3" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                </div>
              </div>

              {/* External IDs Section */}
              <div>
                <Skeleton className="h-6 w-24 mb-3" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded p-3">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="border rounded p-3">
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </div>

              {/* Emissions Section */}
              <div>
                <Skeleton className="h-6 w-32 mb-3" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded p-3">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-28 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>

              {/* Links Section */}
              <div>
                <Skeleton className="h-6 w-16 mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>

              {/* Documents Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="border rounded">
                  <div className="border-b">
                    <div className="grid grid-cols-5 gap-4 p-3">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-4 w-16 hidden md:block" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-32 hidden md:block" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Events Section */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="border rounded">
                  <div className="border-b">
                    <div className="grid grid-cols-3 gap-4 p-3">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <div className="text-gray-600 mb-4">Certificate not found.</div>
            <BackButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BackButton />
              <h1 className="text-2xl font-semibold">
                {EAC_TYPE_NAMES[certificate.type]}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/eacertificates/${id}/edit`}>Edit</Link>
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Basic Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type</dt>
                    <dd className="text-sm text-gray-900">{EAC_TYPE_NAMES[certificate.type]}</dd>
                  </div>
                  {certificate.production_source_id && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Production Source</dt>
                      <dd className="text-sm text-blue-600">
                        <Link className="hover:underline" href={`/production-sources/${certificate.production_source_id}`}>
                          {productionSourceName || certificate.production_source_id}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {certificate.production_tech && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Production Technology</dt>
                      <dd className="text-sm text-gray-900">{certificate.production_tech}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(certificate.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="text-sm text-gray-900">
                      {formatDate(certificate.updated_at)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Amounts</h3>
                {certificate.amounts && certificate.amounts.length > 0 ? (
                  <div className="space-y-2">
                    {certificate.amounts.map((amount, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{amount.amount} {amount.unit}</span>
                        {amount.isPrimary && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No amounts specified</div>
                )}
              </div>
            </div>

            {/* External IDs */}
            {certificate.external_ids && certificate.external_ids.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">External IDs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificate.external_ids.map((externalId, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="text-sm font-medium">{externalId.id}</div>
                      {externalId.externalFieldName && (
                        <div className="text-xs text-gray-600">{externalId.externalFieldName}</div>
                      )}
                      {externalId.description && (
                        <div className="text-xs text-gray-500 mt-1">{externalId.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emissions */}
            {certificate.emissions && certificate.emissions.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Emissions Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificate.emissions.map((emission, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="text-sm font-medium">Emission Data {idx + 1}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        CI: {emission.carbonIntensity} {emission.ciUnit || 'gCO2e/kWh'}
                      </div>
                      <div className="text-xs text-gray-600">
                        EF: {emission.emissionsFactor} {emission.efUnit || 'gCO2e/kWh'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {certificate.links && certificate.links.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Links</h3>
                <div className="space-y-2">
                  {certificate.links.map((link, idx) => (
                    <div key={idx}>
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm break-all"
                      >
                        {link}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">Documents</h3>
                <DocumentManager
                  entityType="eacertificates"
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
                <div className="text-sm text-gray-600">No documents for this certificate yet.</div>
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
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title || '—'}</TableCell>
                        <TableCell>{FILE_TYPE_NAMES[doc.file_type as FileType] || doc.file_type}</TableCell>
                        <TableCell className="hidden md:table-cell">{doc.description || '—'}</TableCell>
                        <TableCell>{formatDateTime(doc.updated_at || doc.created_at)}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline" size="sm">
                            <a href={doc.url} target="_blank" rel="noreferrer">View</a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            {/* Events */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Events</h3>
                <Button asChild size="sm">
                  <Link href={`/events/new?target=EAC&targetId=${id}`}>Add event</Link>
                </Button>
              </div>
              {events.length === 0 ? (
                <div className="text-sm text-gray-600">No events for this certificate yet.</div>
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
                        <TableCell className="font-medium"><Link className="text-blue-600 hover:underline" href={`/events/${ev.id}`}>{ev.type}</Link></TableCell>
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
      </div>
    </div>
  )
}
