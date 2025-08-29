import EACertificateForm from '@/components/eacertificate/EACertificateForm'

interface EditEACertificatePageProps {
  params: Promise<{ id: string }>
}

export default async function EditEACertificatePage({ params }: EditEACertificatePageProps) {
  const { id } = await params
  
  return (
    <EACertificateForm 
      mode="edit" 
      certificateId={id}
      backHref={`/eacertificates/${id}`} 
    />
  )
}
