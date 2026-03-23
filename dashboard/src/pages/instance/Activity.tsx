import { useState, useEffect } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import Badge from '../../components/Badge'
import DataTable from '../../components/DataTable'
import type { RequestLogEntry } from '../../api/types'

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function statusBadge(code: number): 'green' | 'blue' | 'gray' {
  if (code >= 200 && code < 300) return 'green'
  if (code >= 400) return 'gray'
  return 'blue'
}

export default function Activity() {
  const { api } = useInstanceContext()
  const [requests, setRequests] = useState<RequestLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.analytics.requests()
      .then(setRequests)
      .finally(() => setLoading(false))
  }, [api])

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Activity</h1>

      {loading ? (
        <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] py-12 text-center">
          No API requests yet. Make a request to see activity here.
        </p>
      ) : (
        <DataTable
          columns={[
            {
              key: 'method',
              header: 'Method',
              render: (r: RequestLogEntry) => (
                <span className="font-mono text-xs font-medium">{r.method}</span>
              ),
            },
            {
              key: 'model',
              header: 'Model',
              render: (r: RequestLogEntry) => (
                <span className="font-mono text-xs text-[var(--text-secondary)]">{r.model || '—'}</span>
              ),
            },
            {
              key: 'tokens',
              header: 'Tokens',
              render: (r: RequestLogEntry) => (
                <span className="text-xs text-[var(--text-secondary)]">
                  {r.tokens_in + r.tokens_out > 0
                    ? `${formatTokens(r.tokens_in)} → ${formatTokens(r.tokens_out)}`
                    : '—'}
                </span>
              ),
            },
            {
              key: 'latency',
              header: 'Latency',
              render: (r: RequestLogEntry) => (
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  {r.latency_ms > 0 ? formatLatency(r.latency_ms) : '—'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (r: RequestLogEntry) => (
                <Badge variant={statusBadge(r.status_code)}>{r.status_code}</Badge>
              ),
            },
            {
              key: 'time',
              header: 'Time',
              render: (r: RequestLogEntry) => (
                <span className="text-xs text-[var(--text-tertiary)]">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              ),
            },
          ]}
          data={requests}
          emptyMessage="No requests yet."
        />
      )}
    </main>
  )
}
