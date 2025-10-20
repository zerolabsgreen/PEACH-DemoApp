"use client"

import { useParams } from 'next/navigation'
import OrganizationSplitForm from '@/components/organizations/OrganizationSplitForm'

export default function EditOrganizationPage() {
  const params = useParams()
  const id = params?.id as string
  return <OrganizationSplitForm mode="edit" organizationId={id} backHref={`/organizations/${id}`} />
}
