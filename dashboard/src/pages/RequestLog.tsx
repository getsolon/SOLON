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
                  <span style={{ ...styles.method, background: r.method === 'POST' ? '#dbeafe' : '#f3f4f6', color: r.method === 'POST' ? '#1d4ed8' : '#374151' }}>
                    {r.method}
                  </span>
                </td>
                <td style={styles.td}><code style={styles.code}>{r.path}</code></td>
                <td style={styles.td}>{r.model || '—'}</td>
                <td style={styles.td}>{r.tokens_in + r.tokens_out > 0 ? `${r.tokens_in} / ${r.tokens_out}` : '—'}</td>
                <td style={styles.td}>{r.latency_ms}ms</td>
                <td style={styles.td}>
                  <span style={{ ...styles.status, background: r.status_code < 400 ? '#dcfce7' : '#fef2f2', color: r.status_code < 400 ? '#16a34a' : '#dc2626' }}>
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
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  refreshBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer' },
  muted: { color: '#6b7280' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280', fontWeight: 600 },
  td: { padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14 },
  method: { padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 },
  code: { background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 13 },
  status: { padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 },
}
