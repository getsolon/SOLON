import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInstancesStore } from '../../store/instances'
import { createInstanceAPI } from '../../api/instance'
import TopBar from '../../components/TopBar'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import type { Instance } from '../../api/types'

function StatusBadge({ status }: { status: Instance['status'] }) {
  const map = { online: 'green' as const, offline: 'red' as const, unknown: 'gray' as const }
  return <Badge variant={map[status]}>{status}</Badge>
}

export default function Instances() {
  const { instances, add, remove, updateStatus } = useInstancesStore()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    instances.forEach(async (inst) => {
      try {
        const api = createInstanceAPI(inst.url, inst.api_key)
        const health = await api.health()
        const models = await api.models()
        updateStatus(inst.id, 'online', health.version, models.length)
      } catch {
        updateStatus(inst.id, 'offline')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances.length])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAdding(true)
    try {
      const api = createInstanceAPI(url, apiKey)
      await api.health()
      add(name, url, apiKey)
      setModalOpen(false)
      setName('')
      setUrl('')
      setApiKey('')
    } catch {
      setError('Could not connect to instance. Check URL and API key.')
    } finally {
      setAdding(false)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: Instance) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'url',
      header: 'URL',
      render: (row: Instance) => <span className="text-[var(--text-secondary)] font-mono text-xs">{row.url}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Instance) => <StatusBadge status={row.status} />,
    },
    {
      key: 'version',
      header: 'Version',
      render: (row: Instance) => row.version ? `v${row.version}` : '-',
    },
    {
      key: 'models_count',
      header: 'Models',
      render: (row: Instance) => row.models_count ?? '-',
    },
    {
      key: 'actions',
      header: '',
      render: (row: Instance) => (
        <button
          onClick={(e) => { e.stopPropagation(); remove(row.id) }}
          className="text-[var(--text-tertiary)] hover:text-[var(--red)] transition-colors"
          title="Remove instance"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      ),
    },
  ]

  return (
    <>
      <TopBar title="Instances" />
      <main className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">{instances.length} instance{instances.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setModalOpen(true)} size="sm">Add Instance</Button>
        </div>

        {instances.length === 0 ? (
          <EmptyState
            title="No instances yet"
            description="Connect a Solon instance by providing its tunnel URL and admin API key."
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            }
            action={<Button onClick={() => setModalOpen(true)} size="sm">Add Instance</Button>}
          />
        ) : (
          <DataTable
            columns={columns}
            data={instances}
            onRowClick={(row) => navigate(`/instances/${row.id}`)}
          />
        )}

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Instance">
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My GPU Server"
              required
              autoFocus
            />
            <Input
              label="Tunnel URL"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://my-instance.trycloudflare.com"
              required
            />
            <Input
              label="Admin API Key"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sol_sk_live_..."
              required
            />
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding}>{adding ? 'Connecting...' : 'Connect'}</Button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  )
}
