import { useState, useEffect, useCallback } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Badge from '../../components/Badge'
import DataTable from '../../components/DataTable'
import type { APIKey, KeyUsage } from '../../api/types'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function Keys() {
  const { api } = useInstanceContext()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [keyUsage, setKeyUsage] = useState<Record<string, KeyUsage>>({})
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScope, setNewKeyScope] = useState('user')
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('')
  const [newKeyTTL, setNewKeyTTL] = useState('')
  const [newKeyModels, setNewKeyModels] = useState('')
  const [newKeyTunnel, setNewKeyTunnel] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [createdKey, setCreatedKey] = useState('')
  const [loading, setLoading] = useState(true)

  const loadKeys = useCallback(() => {
    api.keys.list()
      .then(setKeys)
      .finally(() => setLoading(false))
    api.analytics.usageByKey()
      .then(setKeyUsage)
      .catch(() => {})
  }, [api])

  useEffect(loadKeys, [loadKeys])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    try {
      const opts: Record<string, unknown> = {
        name: newKeyName.trim(),
        scope: newKeyScope,
      }

      const rl = parseInt(newKeyRateLimit)
      if (rl > 0) opts.rate_limit = rl

      if (newKeyTTL.trim()) {
        // Parse TTL to seconds: "30d" → 30*86400, "24h" → 24*3600
        const ttl = newKeyTTL.trim()
        let seconds = 0
        if (ttl.endsWith('d')) seconds = parseInt(ttl) * 86400
        else if (ttl.endsWith('h')) seconds = parseInt(ttl) * 3600
        else seconds = parseInt(ttl)
        if (seconds > 0) opts.ttl_seconds = seconds
      }

      if (newKeyModels.trim()) {
        opts.allowed_models = newKeyModels.split(',').map(s => s.trim()).filter(Boolean)
      }

      if (!newKeyTunnel) {
        opts.tunnel_access = false
      }

      const result = await api.keys.create(opts as any)
      setCreatedKey(result.key)
      setNewKeyName('')
      setNewKeyScope('user')
      setNewKeyRateLimit('')
      setNewKeyTTL('')
      setNewKeyModels('')
      setNewKeyTunnel(true)
      setShowAdvanced(false)
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

  const isExpired = (key: APIKey) => key.expires_at && new Date(key.expires_at) < new Date()

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">API Keys</h1>

      <form onSubmit={handleCreate} className="space-y-3">
        <div className="flex gap-3">
          <Input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. my-app)"
            className="flex-1"
          />
          <select
            value={newKeyScope}
            onChange={e => setNewKeyScope(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)]"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <Button type="submit">Create Key</Button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
            <div>
              <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Rate Limit (req/min)</label>
              <Input
                value={newKeyRateLimit}
                onChange={e => setNewKeyRateLimit(e.target.value)}
                placeholder="60"
                type="number"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">TTL (e.g. 30d, 24h)</label>
              <Input
                value={newKeyTTL}
                onChange={e => setNewKeyTTL(e.target.value)}
                placeholder="never"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Allowed Models (comma-separated)</label>
              <Input
                value={newKeyModels}
                onChange={e => setNewKeyModels(e.target.value)}
                placeholder="all models"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="tunnelAccess"
                checked={newKeyTunnel}
                onChange={e => setNewKeyTunnel(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="tunnelAccess" className="text-sm text-[var(--text-secondary)]">
                Allow tunnel access
              </label>
            </div>
          </div>
        )}
      </form>

      {createdKey && (
        <div className="rounded-xl border border-[var(--border-success)] bg-[var(--bg-success)] px-5 py-4">
          <p className="text-sm font-medium text-[var(--green)]">New API Key Created</p>
          <p className="mt-2 font-mono text-xs text-[var(--text)] break-all bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg px-3 py-2">
            {createdKey}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">Copy this key now — it won't be shown again.</p>
          <button
            className="mt-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
            onClick={() => navigator.clipboard.writeText(createdKey)}
          >
            Copy to Clipboard
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
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
            { key: 'rate_limit', header: 'Rate', render: (r: APIKey) => `${r.rate_limit}/min` },
            {
              key: 'expires',
              header: 'Expires',
              render: (r: APIKey) => {
                if (!r.expires_at) return <span className="text-[var(--text-tertiary)]">never</span>
                if (isExpired(r)) return <Badge variant="gray">expired</Badge>
                return <span className="text-xs">{new Date(r.expires_at).toLocaleDateString()}</span>
              },
            },
            {
              key: 'usage',
              header: 'Usage',
              render: (r: APIKey) => {
                const u = keyUsage[r.id]
                if (!u) return <span className="text-[var(--text-tertiary)]">—</span>
                return (
                  <span className="text-xs text-[var(--text-secondary)]">
                    {u.request_count} req · {formatTokens(u.total_tokens)} tok
                  </span>
                )
              },
            },
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
  )
}
