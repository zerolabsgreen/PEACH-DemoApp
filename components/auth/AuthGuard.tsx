'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export default function AuthGuard({ 
  children, 
  requireAuth = false, 
  redirectTo = '/dashboard' 
}: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If user is authenticated and trying to access auth pages, redirect to dashboard
      if (user && !requireAuth) {
        router.replace(redirectTo)
        return
      }
      
      // If user is not authenticated and trying to access protected pages, redirect to login
      if (!user && requireAuth) {
        router.replace('/auth/login')
        return
      }
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // If user is authenticated and trying to access auth pages, don't render children
  if (user && !requireAuth) {
    return null
  }

  // If user is not authenticated and trying to access protected pages, don't render children
  if (!user && requireAuth) {
    return null
  }

  return <>{children}</>
}
