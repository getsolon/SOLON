import { useState, useEffect } from 'react'
import { api, APIKey } from '../api'

export default function Keys() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState('')
  const [loading, setLoading] = useState(true)

  const loadKeys = () => {
    api.keys.list()
      .then(setKeys)
      .finally(() => setLoading(false))
  }

  useEffect(loadKeys, [])

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    try {
      const result = await api.keys.create(newKeyName.trim())
      setCreatedKey(result.key)
      setNewKeyName('')
      loadKeys()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Revoke key "${name}"? This cannot be undone.`)) return
    try {
      await api.keys.revoke(id)
      loadKeys()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  return (
    <div>
      <h2 style={s.title}>API Keys</h2>

      <div style={s.createBox}>
        <input
          type="text"
          placeholder="Key name (e.g. my-app)"
          value={newKeyName}
          onChange={e => setNewKeyName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          style={s.input}
        />
        <button onClick={handleCreate} style={s.button}>
          Create Key
        </button>
      </div>

      {createdKey && (
        <div style={s.keyAlert}>
          <strong style={{ color: 'var(--green)' }}>New API Key Created</strong>
          <div style={s.keyDisplay}>{createdKey}</div>
          <p style={s.keyWarning}>Copy this key now — it won't be shown again.</p>
          <button onClick={() => { navigator.clipboard.writeText(createdKey) }} style={s.copyBtn}>
            Copy to Clipboard
          </button>
        </div>
      )}

      {loading ? (
        <p style={s.muted}>Loading keys...</p>
      ) : keys.length === 0 ? (
        <div style={s.empty}>
          <p>No API keys yet. Create one above.</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Prefix</th>
                <th style={s.th}>Scope</th>
                <th style={s.th}>Rate Limit</th>
                <th style={s.th}>Created</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td style={s.td}><strong>{k.name}</strong></td>
                  <td style={s.td}><code style={s.code}>{k.prefix}...</code></td>
                  <td style={s.td}>
                    <span style={{
                      ...s.badge,
                      background: k.scope === 'admin' ? 'var(--bg-badge-blue)' : 'var(--bg-code)',
                      color: k.scope === 'admin' ? 'var(--badge-blue)' : 'var(--text-secondary)',
                    }}>
                      {k.scope}
                    </span>
                  </td>
                  <td style={s.td}>{k.rate_limit}/min</td>
                  <td style={s.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <button onClick={() => handleRevoke(k.id, k.name)} style={s.revokeBtn}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 24px', color: 'var(--text)' },
  createBox: { display: 'flex', gap: 12, marginBottom: 24 },
  input: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-input)', fontSize: 14, outline: 'none', background: 'var(--bg-input)', color: 'var(--text)' },
  button: { padding: '10px 22px', borderRadius: 10, border: 'none', background: 'var(--bg-sidebar)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  keyAlert: { background: 'var(--bg-success)', border: '1px solid var(--border-success)', borderRadius: 14, padding: 20, marginBottom: 24 },
  keyDisplay: { background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 8, padding: '10px 14px', fontFamily: '"SF Mono", Monaco, monospace', fontSize: 13, marginTop: 8, wordBreak: 'break-all', color: 'var(--text)' },
  keyWarning: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 8 },
  copyBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-input)', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer', color: 'var(--text)' },
  muted: { color: 'var(--text-tertiary)' },
  empty: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--text-secondary)' },
  tableWrap: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '14px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 14, color: 'var(--text)' },
  code: { background: 'var(--bg-code)', padding: '2px 8px', borderRadius: 5, fontSize: 12, fontFamily: '"SF Mono", Monaco, monospace', color: 'var(--text-secondary)' },
  badge: { padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 },
  revokeBtn: { padding: '5px 14px', borderRadius: 8, border: '1px solid var(--bg-badge-red)', background: 'var(--bg-error)', color: 'var(--red)', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
}
