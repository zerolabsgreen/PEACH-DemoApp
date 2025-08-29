import EACertificateForm from '@/components/eacertificate/EACertificateForm'

export default function NewEACertificatePage() {
  return (
    <EACertificateForm 
      mode="create" 
      backHref="/eacertificates" 
    />
  )
}
