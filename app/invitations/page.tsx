'use client'

import { useEffect, useState } from 'react'
import { acceptInvitation, listMyInvitations, rejectInvitation } from '@/lib/services/organizations'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'

export default function InvitationsPage() {
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setInvites(await listMyInvitations())
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Invitations</h1>
          <Button variant="outline" asChild><Link href="/dashboard">Back</Link></Button>
        </div>
        <div className="bg-white border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-gray-600">Loading...</TableCell></TableRow>
              ) : invites.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-gray-600">No invitations.</TableCell></TableRow>
              ) : (
                invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.organizations?.name ?? '—'}</TableCell>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell className="capitalize">{inv.status}</TableCell>
                    <TableCell>{new Date(inv.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {inv.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => { try { await acceptInvitation(inv.token); toast.success('Accepted'); await load() } catch (e:any) { toast.error(e.message) } }}>Accept</Button>
                          <Button size="sm" variant="outline" onClick={async () => { try { await rejectInvitation(inv.token); toast.success('Rejected'); await load() } catch (e:any) { toast.error(e.message) } }}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}


