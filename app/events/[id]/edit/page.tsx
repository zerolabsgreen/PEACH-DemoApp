import EventForm from '@/components/events/EventForm'

interface EditEventPageProps {
  params: { id: string }
}

export default function EditEventPage({ params }: EditEventPageProps) {
  return <EventForm mode="edit" eventId={params.id} backHref={`/events/${params.id}`} />
}


