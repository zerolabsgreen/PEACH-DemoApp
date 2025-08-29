import EACertificateForm from '@/components/eacertificate/EACertificateForm'

interface EditEACertificatePageProps {
  params: { id: string }
}

export default function EditEACertificatePage({ params }: EditEACertificatePageProps) {
  return (
    <EACertificateForm 
      mode="edit" 
      certificateId={params.id}
      backHref={`/eacertificates/${params.id}`} 
    />
  )
}
