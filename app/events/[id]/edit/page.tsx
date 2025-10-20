"use client"

import { useParams } from 'next/navigation'
import EventSplitForm from '@/components/events/EventSplitForm'

export default function EditEventPage() {
  const params = useParams()
  const id = params.id as string
  return <EventSplitForm mode="edit" eventId={id} backHref={`/events/${id}`} />
}


