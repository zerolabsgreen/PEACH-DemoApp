import ProductionSourceSplitForm from '@/components/production-sources/ProductionSourceSplitForm'

export default function NewProductionSourcePage() {
  return (
    <ProductionSourceSplitForm 
      mode="create" 
      backHref="/production-sources" 
    />
  )
}
