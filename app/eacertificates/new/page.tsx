import EACertificateSplitForm from '@/components/eacertificate/EACertificateSplitForm'

export default function NewEACertificatePage() {
  return (
    <EACertificateSplitForm 
      mode="create" 
      backHref="/eacertificates" 
    />
  )
}
