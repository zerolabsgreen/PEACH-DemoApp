import EventForm from '@/components/events/EventForm'
import { Suspense } from 'react'

export default function NewEventPage() {
  return (
    <Suspense>
      <EventForm mode="create" backHref="/events" />
    </Suspense>
  )
}


