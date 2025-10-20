"use client"

import { useParams } from 'next/navigation'
import ProductionSourceSplitForm from '@/components/production-sources/ProductionSourceSplitForm'

export default function EditProductionSourcePage() {
  const params = useParams()
  const id = params.id as string
  return <ProductionSourceSplitForm mode="edit" productionSourceId={id} backHref={`/production-sources/${id}`} />
}
