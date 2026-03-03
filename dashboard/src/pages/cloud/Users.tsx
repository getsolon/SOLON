import { useState, useEffect, useMemo } from 'react'
import { cloudAPI } from '../../api/cloud'
import TopBar from '../../components/TopBar'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import DataTable from '../../components/DataTable'
import type { AdminUser } from '../../api/types'

type Filter = 'all' | 'waitlisted' | 'active'

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    cloudAPI.getUsers().then(u => { setUsers(u); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'waitlisted') return users.filter(u => u.role === 'waitlisted')
    if (filter === 'active') return users.filter(u => u.role === 'user' || u.role === 'admin')
    return users
  }, [users, filter])

  const waitlistedCount = users.filter(u => u.role === 'waitlisted').length

  async function handleApprove(user: AdminUser) {
    const updated = await cloudAPI.updateUserRole(user.id, 'user')
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u))
  }

  async function handleRevoke(user: AdminUser) {
    const updated = await cloudAPI.updateUserRole(user.id, 'waitlisted')
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await cloudAPI.deleteUser(deleteTarget.id)
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const roleBadge = (role: string) => {
    const map: Record<string, 'blue' | 'green' | 'red' | 'gray'> = {
      admin: 'blue',
      user: 'green',
      waitlisted: 'red',
    }
    return <Badge variant={map[role] || 'gray'}>{role}</Badge>
  }

  const providerBadge = (provider: string | null) => {
    if (!provider) return <Badge variant="gray">email</Badge>
    return <Badge variant="gray">{provider}</Badge>
  }

  const filterBadges: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'waitlisted', label: 'Waitlisted' },
    { key: 'active', label: 'Active' },
  ]

  return (
    <>
      <TopBar title="Users" />
      <main className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            {users.length} user{users.length !== 1 ? 's' : ''}
            {waitlistedCount > 0 && ` (${waitlistedCount} waitlisted)`}
          </p>
          <div className="flex gap-1">
            {filterBadges.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-brand-light text-white'
                    : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading...</p>
        ) : (
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (r: AdminUser) => (
                  <div className="flex items-center gap-2.5">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="h-7 w-7 rounded-full" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-brand-light flex items-center justify-center text-white text-xs font-medium">
                        {r.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="font-medium">{r.name}</span>
                  </div>
                ),
              },
              { key: 'email', header: 'Email' },
              { key: 'role', header: 'Role', render: (r: AdminUser) => roleBadge(r.role) },
              { key: 'provider', header: 'Provider', render: (r: AdminUser) => providerBadge(r.provider) },
              {
                key: 'created_at',
                header: 'Signed up',
                render: (r: AdminUser) => new Date(r.created_at).toLocaleDateString(),
              },
              {
                key: 'actions',
                header: '',
                render: (r: AdminUser) => {
                  if (r.role === 'admin') return null
                  if (r.role === 'waitlisted') {
                    return (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => handleApprove(r)}>Approve</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(r)}>Reject</Button>
                      </div>
                    )
                  }
                  return (
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleRevoke(r)}>Revoke</Button>
                    </div>
                  )
                },
              },
            ]}
            data={filtered}
            emptyMessage="No users"
          />
        )}

        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Are you sure you want to delete <strong className="text-[var(--text)]">{deleteTarget?.name || deleteTarget?.email}</strong>? This will permanently remove their account and all associated data.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </Modal>
      </main>
    </>
  )
}
