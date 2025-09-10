'use client'

import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import AuthGuard from '@/components/auth/AuthGuard'
import { 
  Building2, 
  Factory, 
  FileText, 
  Calendar,
  TrendingUp,
  Users,
  Activity,
  AlertCircle
} from 'lucide-react'
import { listOrganizationsWithRole } from '@/lib/services/organizations'
import { listEACertificates } from '@/lib/services/eacertificates'
import { listEvents } from '@/lib/services/events'

interface DashboardStats {
  organizations: number
  eacertificates: number
  events: number
  productionSources: number
  recentActivity: any[]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [organizations, eacertificates, events] = await Promise.all([
          listOrganizationsWithRole(),
          listEACertificates(),
          listEvents()
        ])

        // Get recent activity (last 5 events)
        const recentActivity = events.slice(0, 5)

        setStats({
          organizations: organizations.length,
          eacertificates: eacertificates.length,
          events: events.length,
          productionSources: 0, // We'll need to implement this service
          recentActivity
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AuthGuard>
    )
  }

  const statCards = [
    {
      title: "Organizations",
      value: stats?.organizations || 0,
      description: "Total organizations",
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "EA Certificates",
      value: stats?.eacertificates || 0,
      description: "Environmental certificates",
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Events",
      value: stats?.events || 0,
      description: "Total events tracked",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Production Sources",
      value: stats?.productionSources || 0,
      description: "Active production sources",
      icon: Factory,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ]

  return (
    <AuthGuard requireAuth={true}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your EAC management.</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest events and updates across your entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.map((event, index) => (
                    <div key={event.id || index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {event.type || 'Event'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {event.description || 'No description available'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(event.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/organizations/new"
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Building2 className="h-5 w-5 text-blue-600 mb-2" />
                  <p className="text-sm font-medium">New Organization</p>
                </a>
                <a
                  href="/eacertificates/new"
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-5 w-5 text-green-600 mb-2" />
                  <p className="text-sm font-medium">New Certificate</p>
                </a>
                <a
                  href="/events/new"
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="h-5 w-5 text-purple-600 mb-2" />
                  <p className="text-sm font-medium">New Event</p>
                </a>
                <a
                  href="/production-sources/new"
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Factory className="h-5 w-5 text-orange-600 mb-2" />
                  <p className="text-sm font-medium">New Source</p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
