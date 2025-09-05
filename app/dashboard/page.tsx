'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AuthGuard from '@/components/auth/AuthGuard'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sign Out
                </button>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">User ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user?.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user?.email_confirmed_at ? 'Yes' : 'No'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/organizations">
                  <Card className="hover:bg-gray-50 transition-colors h-full">
                    <CardHeader className="h-full flex flex-col">
                      <CardTitle className="text-lg">Organizations</CardTitle>
                      <CardDescription className="flex-1">Create and manage your organizations</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
                <Link href="/production-sources">
                  <Card className="hover:bg-gray-50 transition-colors h-full">
                    <CardHeader className="h-full flex flex-col">
                      <CardTitle className="text-lg">Production Sources</CardTitle>
                      <CardDescription className="flex-1">Create and manage your production sources</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
                <Link href="/eacertificates">
                  <Card className="hover:bg-gray-50 transition-colors h-full">
                    <CardHeader className="h-full flex flex-col">
                      <CardTitle className="text-lg">EA Certificates</CardTitle>
                      <CardDescription className="flex-1">Create and manage your environmental certificates</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
                <Link href="/events">
                  <Card className="hover:bg-gray-50 transition-colors h-full">
                    <CardHeader className="h-full flex flex-col">
                      <CardTitle className="text-lg">Events</CardTitle>
                      <CardDescription className="flex-1">Create and manage events across entities</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
