import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { cloudAPI } from '../../api/cloud'
import TopBar from '../../components/TopBar'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import type { TeamMember } from '../../api/types'

export default function Team() {
  const user = useAuthStore(s => s.user)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)

  const isTeamPlan = user?.plan === 'team' || user?.plan === 'enterprise'

  useEffect(() => {
    cloudAPI.getTeamMembers().then(m => { setMembers(m); setLoading(false) })
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    try {
      const member = await cloudAPI.inviteTeamMember(email, role)
      setMembers([...members, member])
      setModalOpen(false)
      setEmail('')
      setRole('member')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(id: string) {
    await cloudAPI.removeTeamMember(id)
    setMembers(members.filter(m => m.id !== id))
  }

  if (!isTeamPlan) {
    return (
      <>
        <TopBar title="Team" />
        <main className="p-4 lg:p-6">
          <EmptyState
            title="Team plan required"
            description="Upgrade to Team or Enterprise to invite team members and collaborate."
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            action={<Button onClick={() => window.location.href = '/billing'}>Upgrade Plan</Button>}
          />
        </main>
      </>
    )
  }

  const roleBadge = (role: string) => {
    const map: Record<string, 'blue' | 'green' | 'gray'> = { owner: 'blue', admin: 'green', member: 'gray' }
    return <Badge variant={map[role] || 'gray'}>{role}</Badge>
  }

  return (
    <>
      <TopBar title="Team" />
      <main className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setModalOpen(true)} size="sm">Invite Member</Button>
        </div>

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading...</p>
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (r: TeamMember) => <span className="font-medium">{r.name}</span> },
              { key: 'email', header: 'Email' },
              { key: 'role', header: 'Role', render: (r: TeamMember) => roleBadge(r.role) },
              {
                key: 'joined_at',
                header: 'Joined',
                render: (r: TeamMember) => new Date(r.joined_at).toLocaleDateString(),
              },
              {
                key: 'actions',
                header: '',
                render: (r: TeamMember) =>
                  r.role !== 'owner' ? (
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(r.id)}>Remove</Button>
                  ) : null,
              },
            ]}
            data={members}
            emptyMessage="No team members"
          />
        )}

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invite Team Member">
          <form onSubmit={handleInvite} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              required
              autoFocus
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--text)]">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'admin' | 'member')}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-light/50"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviting}>{inviting ? 'Inviting...' : 'Send Invite'}</Button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  )
}
