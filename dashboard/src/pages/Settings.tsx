import { useState, useEffect } from 'react'
import { api, HealthStatus, TunnelStatus } from '../api'

export default function Settings() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [tunnel, setTunnel] = useState<TunnelStatus | null>(null)
  const [tunnelLoading, setTunnelLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.health().then(setHealth).catch(e => setError(e.message))
    api.tunnel.status().then(setTunnel).catch(() => {})
  }, [])

  const toggleTunnel = async () => {
    setTunnelLoading(true)
    setError('')
    try {
      if (tunnel?.enabled) {
        await api.tunnel.disable()
      } else {
        await api.tunnel.enable()
      }
      const status = await api.tunnel.status()
      setTunnel(status)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTunnelLoading(false)
    }
  }

  return (
    <div>
      <h2 style={styles.title}>Settings</h2>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Server Info</h3>
        <div style={styles.card}>
          <Row label="Status" value={health?.status === 'ok' ? 'Running' : 'Offline'} />
          <Row label="Version" value={health?.version || '—'} />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Secure Tunnel</h3>
        <div style={styles.card}>
          <Row label="Status" value={tunnel?.enabled ? 'Enabled' : 'Disabled'} />
          {tunnel?.enabled && tunnel.url && <Row label="URL" value={tunnel.url} />}
          {tunnel?.enabled && tunnel.provider && <Row label="Provider" value={tunnel.provider} />}
          <div style={styles.rowActions}>
            <button
              onClick={toggleTunnel}
              disabled={tunnelLoading}
              style={tunnel?.enabled ? styles.disableBtn : styles.enableBtn}
            >
              {tunnelLoading ? 'Working...' : tunnel?.enabled ? 'Disable Tunnel' : 'Enable Tunnel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 24px', color: 'var(--text)' },
  error: { background: 'var(--bg-error)', color: 'var(--red)', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow)' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' },
  rowLabel: { fontSize: 14, color: 'var(--text-tertiary)' },
  rowValue: { fontSize: 14, fontWeight: 500, color: 'var(--text)' },
  rowActions: { paddingTop: 16 },
  enableBtn: { padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--bg-sidebar)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  disableBtn: { padding: '8px 20px', borderRadius: 8, border: '1px solid var(--bg-badge-red)', background: 'var(--bg-error)', color: 'var(--red)', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
}
