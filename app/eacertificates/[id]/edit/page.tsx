"use client"

import { useParams } from 'next/navigation'
import EACertificateSplitForm from '@/components/eacertificate/EACertificateSplitForm'

export default function EditEACertificatePage() {
  const params = useParams()
  const id = params.id as string
  return <EACertificateSplitForm mode="edit" certificateId={id} backHref={`/eacertificates/${id}`} />
}
