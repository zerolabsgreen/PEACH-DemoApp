"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import { useEffect, useMemo, useState } from 'react'
import { listEACertificates } from '@/lib/services/eacertificates'
import { Skeleton } from '@/components/ui/skeleton'
import { EAC_TYPE_NAMES, EACertificate, EACType } from '@/lib/types/eacertificate'
import { EACertificatesTable } from '@/components/eacertificate/EACertificatesTable'

export default function EACertificatesIndexPage() {
  const [certificates, setCertificates] = useState<EACertificate[]>([])
  const [loading, setLoading] = useState(true)

  const loadCertificates = async () => {
    try {
      const certs = await listEACertificates()
      setCertificates(certs as EACertificate[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCertificates()
  }, [])

  const totals = useMemo(() => {
    const total = certificates.length
    const byType = Object.values(EACType).reduce((acc, t) => {
      acc[t] = certificates.filter(c => c.type === t).length
      return acc
    }, {} as Record<EACType, number>)
    return { total, byType }
  }, [certificates])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-2xl font-semibold">EACertificates</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/eacertificates/new">Create EACertificate</Link>
          </Button>
        </div>
      </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded p-5"><Skeleton className="h-6 w-24" /></div>
            <div className="bg-white border rounded p-5 hidden md:block"><Skeleton className="h-6 w-24" /></div>
            <div className="bg-white border rounded p-5 hidden md:block"><Skeleton className="h-6 w-24" /></div>
            <div className="bg-white border rounded p-5 hidden md:block"><Skeleton className="h-6 w-24" /></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border rounded p-5">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-2xl font-semibold">{totals.total}</div>
            </div>
            <div className="bg-white border rounded p-5">
              <div className="text-sm text-gray-500">REC</div>
              <div className="text-xl font-semibold">{totals.byType[EACType.REC] || 0}</div>
            </div>
            <div className="bg-white border rounded p-5">
              <div className="text-sm text-gray-500">RTC</div>
              <div className="text-xl font-semibold">{totals.byType[EACType.RTC] || 0}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white border rounded p-6 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : certificates.length === 0 ? (
          <div className="bg-white border rounded p-6 text-center">
            <div className="text-gray-600 mb-4">No EACertificates yet.</div>
            <Button asChild>
              <Link href="/eacertificates/new">Create your first certificate</Link>
            </Button>
          </div>
        ) : (
          <EACertificatesTable data={certificates} onDelete={loadCertificates} />
        )}
    </div>
  )
}
