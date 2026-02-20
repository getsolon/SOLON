import { useState, useEffect } from 'react'
import { api, HealthStatus, UsageStats } from '../api'

export default function Overview() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.health().then(setHealth).catch(e => setError(e.message))
    api.analytics.usage().then(setUsage).catch(() => {})
  }, [])

  return (
    <div>
      <h2 style={s.title}>Overview</h2>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.cards}>
        <Card
          label="Status"
          value={health?.status === 'ok' ? 'Healthy' : 'Offline'}
          color={health?.status === 'ok' ? 'var(--green)' : 'var(--red)'}
        />
        <Card label="Version" value={health?.version || '—'} />
        <Card label="Requests Today" value={String(usage?.requests_today ?? '—')} />
        <Card label="Total Requests" value={String(usage?.total_requests ?? '—')} />
      </div>

      {usage && (
        <div style={s.cards}>
          <Card label="Tokens In" value={formatNumber(usage.total_tokens_in)} />
          <Card label="Tokens Out" value={formatNumber(usage.total_tokens_out)} />
          <Card label="Avg Latency" value={`${Math.round(usage.avg_latency_ms)}ms`} />
          <Card label="Most Used Model" value={usage.most_used_model || '—'} />
        </div>
      )}
    </div>
  )
}

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{label}</div>
      <div style={{ ...s.cardValue, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const s: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 24px', color: 'var(--text)' },
  error: { background: 'var(--bg-error)', color: 'var(--red)', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 },
  card: { background: 'var(--bg-card)', borderRadius: 14, padding: '22px 24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' },
  cardLabel: { fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 500 },
  cardValue: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' },
}
