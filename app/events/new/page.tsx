import EventForm from '@/components/events/EventForm'
import { BackButton } from '@/components/ui/back-button'

export default function NewEventPage() {
  return (
    <EventForm mode="create" backHref="/events" />
  )
}


