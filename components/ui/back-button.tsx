'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface BackButtonProps {
  label?: string
  href?: string
}

export function BackButton({ label = 'Back', href }: BackButtonProps) {
  const router = useRouter()
  
  if (href) {
    return (
      <Button asChild variant="outline">
        <Link href={href}>
          <ChevronLeft className="h-4 w-4" /> {label}
        </Link>
      </Button>
    )
  }
  
  return (
    <Button variant="outline" onClick={() => router.back()}>
      <ChevronLeft className="h-4 w-4" /> {label}
    </Button>
  )
}


