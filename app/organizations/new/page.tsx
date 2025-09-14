import OrganizationSplitForm from '@/components/organizations/OrganizationSplitForm'

export default function NewOrganizationPage() {
  return (
    <OrganizationSplitForm 
      mode="create" 
      backHref="/organizations" 
    />
  )
}


