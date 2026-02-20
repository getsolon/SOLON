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
      <h2 style={styles.title}>Overview</h2>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.cards}>
        <Card
          label="Status"
          value={health?.status === 'ok' ? 'Healthy' : 'Offline'}
          color={health?.status === 'ok' ? '#16a34a' : '#dc2626'}
        />
        <Card label="Version" value={health?.version || '—'} />
        <Card label="Requests Today" value={String(usage?.requests_today ?? '—')} />
        <Card label="Total Requests" value={String(usage?.total_requests ?? '—')} />
      </div>

      {usage && (
        <div style={styles.cards}>
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
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={{ ...styles.cardValue, color: color || '#1a1a2e' }}>{value}</div>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const styles: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 24px' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 },
  card: { background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e5e7eb' },
  cardLabel: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 28, fontWeight: 700 },
}
