import EventSplitForm from '@/components/events/EventSplitForm'
import { Suspense } from 'react'

export default function NewEventPage() {
  return (
    <Suspense>
      <EventSplitForm mode="create" backHref="/events" />
    </Suspense>
  )
}


