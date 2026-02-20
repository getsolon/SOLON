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
      <h2 style={s.title}>Models</h2>

      {loading ? (
        <p style={s.muted}>Loading models...</p>
      ) : models.length === 0 ? (
        <div style={s.empty}>
          <p style={{ marginBottom: 8 }}>No models installed.</p>
          <code style={s.code}>solon models pull llama3.2:8b</code>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Size</th>
                <th style={s.th}>Family</th>
                <th style={s.th}>Params</th>
                <th style={s.th}>Quantization</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.name}>
                  <td style={s.td}><strong>{m.name}</strong></td>
                  <td style={s.td}>{formatSize(m.size)}</td>
                  <td style={s.td}>{m.family || '—'}</td>
                  <td style={s.td}>{m.params || '—'}</td>
                  <td style={s.td}>{m.quantization || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

const s: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 24px', color: 'var(--text)' },
  muted: { color: 'var(--text-tertiary)' },
  empty: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  code: { background: 'var(--bg-code)', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontFamily: '"SF Mono", Monaco, monospace', color: 'var(--text)' },
  tableWrap: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '14px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 14, color: 'var(--text)' },
}
