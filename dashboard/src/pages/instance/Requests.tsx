import { useState, useEffect } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import TopBar from '../../components/TopBar'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import DataTable from '../../components/DataTable'
import type { RequestLogEntry } from '../../api/types'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Requests() {
  const { api } = useInstanceContext()
  const [requests, setRequests] = useState<RequestLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    api.analytics.requests()
      .then(setRequests)
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [api])

  return (
    <>
      <TopBar title="Requests" />
      <main className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </p>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {loading && requests.length === 0 ? (
          <p className="text-[var(--text-secondary)]">Loading requests...</p>
        ) : (
          <DataTable
            columns={[
              { key: 'created_at', header: 'Time', render: (r: RequestLogEntry) => formatTime(r.created_at) },
              { key: 'method', header: 'Method', render: (r: RequestLogEntry) => <Badge variant="blue">{r.method}</Badge> },
              { key: 'path', header: 'Path', render: (r: RequestLogEntry) => <span className="font-mono text-xs">{r.path}</span> },
              { key: 'model', header: 'Model', render: (r: RequestLogEntry) => r.model || '—' },
              {
                key: 'tokens',
                header: 'Tokens',
                render: (r: RequestLogEntry) => r.tokens_in + r.tokens_out > 0 ? `${r.tokens_in} / ${r.tokens_out}` : '—',
              },
              { key: 'latency_ms', header: 'Latency', render: (r: RequestLogEntry) => `${r.latency_ms}ms` },
              {
                key: 'status_code',
                header: 'Status',
                render: (r: RequestLogEntry) => (
                  <Badge variant={r.status_code < 400 ? 'green' : 'red'}>{r.status_code}</Badge>
                ),
              },
            ]}
            data={requests}
            emptyMessage="No requests yet. Make an API call to see it here."
          />
        )}
      </main>
    </>
  )
}
