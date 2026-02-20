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
      <h2 style={styles.title}>API Keys</h2>

      <div style={styles.createBox}>
        <input
          type="text"
          placeholder="Key name (e.g. my-app)"
          value={newKeyName}
          onChange={e => setNewKeyName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          style={styles.input}
        />
        <button onClick={handleCreate} style={styles.button}>
          Create Key
        </button>
      </div>

      {createdKey && (
        <div style={styles.keyAlert}>
          <strong>New API Key Created</strong>
          <div style={styles.keyDisplay}>{createdKey}</div>
          <p style={styles.keyWarning}>Copy this key now — it won't be shown again.</p>
          <button onClick={() => { navigator.clipboard.writeText(createdKey); }} style={styles.copyBtn}>
            Copy to Clipboard
          </button>
        </div>
      )}

      {loading ? (
        <p style={styles.muted}>Loading keys...</p>
      ) : keys.length === 0 ? (
        <div style={styles.empty}>
          <p>No API keys yet. Create one above.</p>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Prefix</th>
              <th style={styles.th}>Scope</th>
              <th style={styles.th}>Rate Limit</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id}>
                <td style={styles.td}><strong>{k.name}</strong></td>
                <td style={styles.td}><code style={styles.code}>{k.prefix}...</code></td>
                <td style={styles.td}>{k.scope}</td>
                <td style={styles.td}>{k.rate_limit}/min</td>
                <td style={styles.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <button
                    onClick={() => handleRevoke(k.id, k.name)}
                    style={styles.revokeBtn}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 24px' },
  createBox: { display: 'flex', gap: 12, marginBottom: 24 },
  input: { flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' },
  button: { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  keyAlert: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 20, marginBottom: 24 },
  keyDisplay: { background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, padding: '10px 14px', fontFamily: 'monospace', fontSize: 14, marginTop: 8, wordBreak: 'break-all' },
  keyWarning: { fontSize: 13, color: '#6b7280', marginTop: 8, marginBottom: 8 },
  copyBtn: { padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer' },
  muted: { color: '#6b7280' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' },
  th: { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280', fontWeight: 600 },
  td: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14 },
  code: { background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 13 },
  revokeBtn: { padding: '4px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer' },
}
