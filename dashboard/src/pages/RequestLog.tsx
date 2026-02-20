import { useState, useEffect } from 'react'
import { api, RequestLogEntry } from '../api'

export default function RequestLog() {
  const [requests, setRequests] = useState<RequestLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.analytics.requests()
      .then(setRequests)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>Request Log</h2>
        <button onClick={() => { setLoading(true); api.analytics.requests().then(setRequests).finally(() => setLoading(false)) }} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={styles.muted}>Loading requests...</p>
      ) : requests.length === 0 ? (
        <div style={styles.empty}>
          <p>No requests yet. Make an API call to see it here.</p>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Method</th>
              <th style={styles.th}>Path</th>
              <th style={styles.th}>Model</th>
              <th style={styles.th}>Tokens</th>
              <th style={styles.th}>Latency</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id}>
                <td style={styles.td}>{formatTime(r.created_at)}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.method, background: r.method === 'POST' ? 'var(--bg-badge-blue)' : 'var(--bg-code)', color: r.method === 'POST' ? 'var(--badge-blue)' : 'var(--text-secondary)' }}>
                    {r.method}
                  </span>
                </td>
                <td style={styles.td}><code style={styles.code}>{r.path}</code></td>
                <td style={styles.td}>{r.model || '—'}</td>
                <td style={styles.td}>{r.tokens_in + r.tokens_out > 0 ? `${r.tokens_in} / ${r.tokens_out}` : '—'}</td>
                <td style={styles.td}>{r.latency_ms}ms</td>
                <td style={styles.td}>
                  <span style={{ ...styles.status, background: r.status_code < 400 ? 'var(--bg-badge-green)' : 'var(--bg-badge-red)', color: r.status_code < 400 ? 'var(--badge-green)' : 'var(--badge-red)' }}>
                    {r.status_code}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text)' },
  refreshBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-input)', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer', color: 'var(--text)' },
  muted: { color: 'var(--text-tertiary)' },
  empty: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '12px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 14, color: 'var(--text)' },
  method: { padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 },
  code: { background: 'var(--bg-code)', padding: '2px 8px', borderRadius: 5, fontSize: 12, fontFamily: '"SF Mono", Monaco, monospace', color: 'var(--text-secondary)' },
  status: { padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 },
}
