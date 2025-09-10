"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

interface BackButtonProps {
  label?: string
  className?: string
}

export function BackButton({ label = 'Back', className }: BackButtonProps) {
  const router = useRouter()
  
  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className={`mr-3 md:mr-5 rounded-full px-3 md:px-4 h-9 border border-transparent hover:border-gray-200 hover:bg-muted/60 shadow-sm hover:shadow transition ${className ?? ''}`}
      aria-label={label}
    >
      <ChevronLeft className="h-4 w-4 -ml-0.5 mr-1.5" /> {label}
    </Button>
  )
}


