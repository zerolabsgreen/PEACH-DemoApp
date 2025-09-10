'use client'

import { useAuth } from '@/lib/auth-context'
import { formatDate } from '@/lib/date-utils'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/ui/back-button'
import AuthGuard from '@/components/auth/AuthGuard'
import { 
  User, 
  Mail, 
  Calendar, 
  Shield,
  LogOut,
  Settings
} from 'lucide-react'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-2xl font-semibold">Profile & Settings</h1>
          </div>
        </div>

        <div className="max-w-4xl space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your personal account details and verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </div>
                  <div className="text-lg font-medium">{user?.email}</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Shield className="h-4 w-4" />
                    Verification Status
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user?.email_confirmed_at 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    User ID
                  </div>
                  <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {user?.id}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    Member Since
                  </div>
                  <div className="text-lg font-medium">
                    {formatDate(user?.created_at)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Actions
              </CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium">Sign Out</h3>
                  <p className="text-sm text-gray-500">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Technical details about your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Account Type:</span>
                  <span className="ml-2 font-medium">Standard</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Login:</span>
                  <span className="ml-2 font-medium">
                    {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Email Confirmed:</span>
                  <span className="ml-2 font-medium">
                    {user?.email_confirmed_at ? formatDate(user.email_confirmed_at) : 'Not confirmed'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Account Status:</span>
                  <span className="ml-2 font-medium text-green-600">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
