'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter()
  return (
    <Button variant="outline" onClick={() => router.back()}>
      <ChevronLeft className="h-4 w-4" /> {label}
    </Button>
  )
}


