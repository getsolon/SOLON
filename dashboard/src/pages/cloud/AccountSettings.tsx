import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { cloudAPI } from '../../api/cloud'
import TopBar from '../../components/TopBar'
import Card from '../../components/Card'
import Button from '../../components/Button'
import Input from '../../components/Input'
import DataTable from '../../components/DataTable'
import type { CloudAPIToken } from '../../api/types'

export default function AccountSettings() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  const [tokens, setTokens] = useState<CloudAPIToken[]>([])
  const [newTokenName, setNewTokenName] = useState('')
  const [createdToken, setCreatedToken] = useState('')

  useEffect(() => {
    cloudAPI.getAPITokens().then(setTokens)
  }, [])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg('')
    try {
      await cloudAPI.updateProfile({ name, email })
      setProfileMsg('Profile updated')
    } catch (err) {
      setProfileMsg((err as Error).message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPw.length < 8) { setPwMsg('Password must be at least 8 characters'); return }
    setPwSaving(true)
    setPwMsg('')
    try {
      await cloudAPI.changePassword(currentPw, newPw)
      setPwMsg('Password changed')
      setCurrentPw('')
      setNewPw('')
    } catch (err) {
      setPwMsg((err as Error).message)
    } finally {
      setPwSaving(false)
    }
  }

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault()
    if (!newTokenName.trim()) return
    const res = await cloudAPI.createAPIToken(newTokenName)
    setCreatedToken(res.token)
    setNewTokenName('')
    cloudAPI.getAPITokens().then(setTokens)
  }

  async function handleRevokeToken(id: string) {
    await cloudAPI.revokeAPIToken(id)
    setTokens(tokens.filter(t => t.id !== id))
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return
    await cloudAPI.deleteAccount()
    logout()
    navigate('/login')
  }

  return (
    <>
      <TopBar title="Settings" />
      <main className="p-4 lg:p-6 space-y-6 max-w-2xl">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Profile</h3>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            {profileMsg && <p className="text-sm text-[var(--text-secondary)]">{profileMsg}</p>}
            <Button type="submit" disabled={profileSaving} size="sm">
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input label="Current Password" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
            <Input label="New Password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
            {pwMsg && <p className="text-sm text-[var(--text-secondary)]">{pwMsg}</p>}
            <Button type="submit" disabled={pwSaving} size="sm">
              {pwSaving ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Cloud API Tokens</h3>
          <form onSubmit={handleCreateToken} className="flex gap-2 mb-4">
            <Input
              value={newTokenName}
              onChange={e => setNewTokenName(e.target.value)}
              placeholder="Token name..."
              className="flex-1"
            />
            <Button type="submit" size="sm">Create</Button>
          </form>
          {createdToken && (
            <div className="rounded-lg border border-[var(--border-success)] bg-[var(--bg-success)] px-4 py-3 mb-4">
              <p className="text-sm font-medium text-[var(--green)]">Token Created</p>
              <p className="mt-1 font-mono text-xs text-[var(--text)] break-all">{createdToken}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Copy this token now. It won't be shown again.</p>
            </div>
          )}
          <DataTable
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'prefix', header: 'Token', render: (r: CloudAPIToken) => <span className="font-mono text-xs">{r.prefix}</span> },
              { key: 'created_at', header: 'Created', render: (r: CloudAPIToken) => new Date(r.created_at).toLocaleDateString() },
              {
                key: 'actions',
                header: '',
                render: (r: CloudAPIToken) => (
                  <Button variant="ghost" size="sm" onClick={() => handleRevokeToken(r.id)}>Revoke</Button>
                ),
              },
            ]}
            data={tokens}
            emptyMessage="No API tokens"
          />
        </Card>

        <Card className="p-6 border-[var(--red)]/30">
          <h3 className="text-sm font-medium text-[var(--red)] mb-2">Danger Zone</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="danger" size="sm" onClick={handleDeleteAccount}>Delete Account</Button>
        </Card>
      </main>
    </>
  )
}
