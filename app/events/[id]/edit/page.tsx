import EventForm from '@/components/events/EventForm'
import { use } from 'react'

interface EditEventPageProps {
  params: Promise<{ id: string }>
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const { id } = use(params)
  return <EventForm mode="edit" eventId={id} backHref={`/events/${id}`} />
}


