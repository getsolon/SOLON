import { useState, useEffect, useCallback } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import TopBar from '../../components/TopBar'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Badge from '../../components/Badge'
import DataTable from '../../components/DataTable'
import type { APIKey } from '../../api/types'

export default function Keys() {
  const { api } = useInstanceContext()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState('')
  const [loading, setLoading] = useState(true)

  const loadKeys = useCallback(() => {
    api.keys.list()
      .then(setKeys)
      .finally(() => setLoading(false))
  }, [api])

  useEffect(loadKeys, [loadKeys])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    try {
      const result = await api.keys.create(newKeyName.trim())
      setCreatedKey(result.key)
      setNewKeyName('')
      loadKeys()
    } catch (e: unknown) {
      alert(`Error: ${(e as Error).message}`)
    }
  }

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Revoke key "${name}"? This cannot be undone.`)) return
    await api.keys.revoke(id)
    loadKeys()
  }

  return (
    <>
      <TopBar title="API Keys" />
      <main className="p-4 lg:p-6 space-y-4">
        <form onSubmit={handleCreate} className="flex gap-3">
          <Input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. my-app)"
            className="flex-1"
          />
          <Button type="submit">Create Key</Button>
        </form>

        {createdKey && (
          <div className="rounded-lg border border-[var(--border-success)] bg-[var(--bg-success)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--green)]">New API Key Created</p>
            <p className="mt-1 font-mono text-xs text-[var(--text)] break-all bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg px-3 py-2">
              {createdKey}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Copy this key now — it won't be shown again.</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => navigator.clipboard.writeText(createdKey)}
            >
              Copy to Clipboard
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading keys...</p>
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (r: APIKey) => <span className="font-medium">{r.name}</span> },
              { key: 'prefix', header: 'Key', render: (r: APIKey) => <span className="font-mono text-xs text-[var(--text-secondary)]">{r.prefix}...</span> },
              {
                key: 'scope',
                header: 'Scope',
                render: (r: APIKey) => <Badge variant={r.scope === 'admin' ? 'blue' : 'gray'}>{r.scope}</Badge>,
              },
              { key: 'rate_limit', header: 'Rate Limit', render: (r: APIKey) => `${r.rate_limit}/min` },
              { key: 'created_at', header: 'Created', render: (r: APIKey) => new Date(r.created_at).toLocaleDateString() },
              {
                key: 'actions',
                header: '',
                render: (r: APIKey) => (
                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(r.id, r.name)} className="text-[var(--red)] hover:text-[var(--red)]">
                    Revoke
                  </Button>
                ),
              },
            ]}
            data={keys}
            emptyMessage="No API keys yet. Create one above."
          />
        )}
      </main>
    </>
  )
}
