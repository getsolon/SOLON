import { useState, useEffect } from 'react'
import type { ProviderConfig } from '../../api/types'
import { providerAPI } from '../../api/local'

const WELL_KNOWN: Record<string, { label: string; placeholder: string }> = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  openai: { label: 'OpenAI', placeholder: 'sk-...' },
}

const WELL_KNOWN_MODELS: Record<string, string[]> = {
  anthropic: ['anthropic/claude-opus-4-20250514', 'anthropic/claude-sonnet-4-20250514', 'anthropic/claude-haiku-4-5-20251001'],
  openai: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/gpt-3.5-turbo'],
}

export default function Providers() {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    providerAPI.list()
      .then(setProviders)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleRemove = async (name: string) => {
    try {
      await providerAPI.remove(name)
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Providers</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Configure inference providers to use cloud models like Claude, GPT, and more.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Add Provider
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[var(--text-tertiary)]">Loading...</div>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
          <p className="text-[var(--text-secondary)] mb-2">No providers configured</p>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            Add a provider to use cloud models like Claude or GPT alongside local models.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            Add Your First Provider
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-[var(--text-tertiary)] font-medium">Provider</th>
                <th className="text-left px-4 py-3 text-[var(--text-tertiary)] font-medium">Base URL</th>
                <th className="text-left px-4 py-3 text-[var(--text-tertiary)] font-medium">API Key</th>
                <th className="text-left px-4 py-3 text-[var(--text-tertiary)] font-medium">Models</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {providers.map(p => (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--text)]">
                    {WELL_KNOWN[p.name]?.label || p.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">
                    {p.base_url}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">
                    {p.api_key}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">
                    {(WELL_KNOWN_MODELS[p.name] || []).map(m => (
                      <span key={m} className="inline-block mr-1.5 mb-1 px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        {m.split('/')[1]}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(p.name)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddProviderModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

function AddProviderModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [provider, setProvider] = useState('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [customName, setCustomName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isCustom = provider === 'custom'
  const name = isCustom ? customName : provider

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }
    if (isCustom && !customName.trim()) {
      setError('Provider name is required')
      return
    }
    if (isCustom && !baseUrl.trim()) {
      setError('Base URL is required for custom providers')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await providerAPI.add(name, apiKey.trim(), isCustom ? baseUrl.trim() : undefined)
      onAdded()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Add Provider</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Provider</label>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {isCustom && (
            <>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Provider Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="nvidia-nim"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={WELL_KNOWN[provider]?.placeholder || 'Your API key'}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm font-mono"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Provider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
