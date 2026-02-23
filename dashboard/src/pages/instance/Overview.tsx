import { useState, useEffect } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import TopBar from '../../components/TopBar'
import Card from '../../components/Card'
import type { HealthStatus, UsageStats } from '../../api/types'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function Overview() {
  const { api, instanceName } = useInstanceContext()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.health().then(setHealth).catch(e => setError(e.message))
    api.analytics.usage().then(setUsage).catch(() => {})
  }, [api])

  return (
    <>
      <TopBar title={instanceName} />
      <main className="p-4 lg:p-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-[var(--bg-error)] px-4 py-3 text-sm text-[var(--red)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            title="Status"
            value={health?.status === 'ok' ? 'Healthy' : 'Offline'}
            subtitle={health?.version ? `v${health.version}` : undefined}
          />
          <Card title="Requests Today" value={String(usage?.requests_today ?? '—')} />
          <Card title="Total Requests" value={String(usage?.total_requests ?? '—')} />
          <Card title="Unique Keys" value={String(usage?.unique_keys_used ?? '—')} />
        </div>

        {usage && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Tokens In" value={formatNumber(usage.total_tokens_in)} />
            <Card title="Tokens Out" value={formatNumber(usage.total_tokens_out)} />
            <Card title="Avg Latency" value={`${Math.round(usage.avg_latency_ms)}ms`} />
            <Card title="Most Used Model" value={usage.most_used_model || '—'} />
          </div>
        )}
      </main>
    </>
  )
}
