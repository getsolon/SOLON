import { useState, useEffect } from 'react'
import { api, ModelInfo } from '../api'

export default function Models() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.models()
      .then(setModels)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 style={styles.title}>Models</h2>

      {loading ? (
        <p style={styles.muted}>Loading models...</p>
      ) : models.length === 0 ? (
        <div style={styles.empty}>
          <p>No models installed.</p>
          <code style={styles.code}>solon models pull llama3.2:8b</code>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Family</th>
              <th style={styles.th}>Params</th>
              <th style={styles.th}>Quantization</th>
            </tr>
          </thead>
          <tbody>
            {models.map(m => (
              <tr key={m.name}>
                <td style={styles.td}>
                  <strong>{m.name}</strong>
                </td>
                <td style={styles.td}>{formatSize(m.size)}</td>
                <td style={styles.td}>{m.family || '—'}</td>
                <td style={styles.td}>{m.params || '—'}</td>
                <td style={styles.td}>{m.quantization || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

const styles: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 24px' },
  muted: { color: '#6b7280' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, textAlign: 'center' },
  code: { background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280', fontWeight: 600 },
  td: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14 },
}
