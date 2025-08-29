'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { useEffect, useState } from 'react'
import { listEACertificates } from '@/lib/services/eacertificates'
import { Skeleton } from '@/components/ui/skeleton'
import { EAC_TYPE_NAMES, EACertificate } from '@/lib/types/eacertificate'

export default function EACertificatesIndexPage() {
  const [certificates, setCertificates] = useState<EACertificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const certs = await listEACertificates()
        setCertificates(certs as EACertificate[])
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
          <div className="flex items-center gap-2">
            <BackButton href="/dashboard" />
            <h1 className="text-2xl font-semibold">EA Certificates</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/eacertificates/new">Create EA Certificate</Link>
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded p-5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
            <div className="bg-white border rounded p-5 hidden md:block">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          </div>
        ) : certificates.length === 0 ? (
          <div className="bg-white border rounded p-6 text-center">
            <div className="text-gray-600 mb-4">No EA certificates yet.</div>
            <Button asChild>
              <Link href="/eacertificates/new">Create your first certificate</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((certificate) => (
              <Link 
                key={certificate.id} 
                href={`/eacertificates/${certificate.id}`} 
                className="bg-white border rounded p-5 hover:bg-gray-50 block transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-medium">
                    {EAC_TYPE_NAMES[certificate.type]}
                  </div>
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {certificate.type}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Created: {new Date(certificate.created_at).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date(certificate.updated_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
