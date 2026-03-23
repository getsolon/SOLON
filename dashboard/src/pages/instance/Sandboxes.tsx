import { useState, useEffect } from 'react'
import type { SandboxInfo, SandboxPreset } from '../../api/types'
import { sandboxAPI } from '../../api/local'

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-green-400',
  created: 'bg-yellow-400',
  stopped: 'bg-gray-400',
  failed: 'bg-red-400',
}

const POLICY_LABELS: Record<string, string> = {
  full: 'Full Access',
  'api-only': 'API Only',
  'inference-only': 'Inference Only',
  custom: 'Custom',
}

export default function Sandboxes() {
  const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    sandboxAPI.list()
      .then(r => {
        setSandboxes(r.sandboxes || [])
        setAvailable(r.available)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAction = async (id: string, action: 'start' | 'stop' | 'remove') => {
    setActionLoading(id)
    try {
      if (action === 'start') await sandboxAPI.start(id)
      else if (action === 'stop') await sandboxAPI.stop(id)
      else if (action === 'remove') await sandboxAPI.remove(id)
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  if (!available && !loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-[var(--text)]">Sandboxes</h1>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
          <p className="text-[var(--text-secondary)] mb-2">Docker not detected</p>
          <p className="text-sm text-[var(--text-tertiary)]">
            Sandbox management requires Docker. Install Docker and restart Solon to enable sandboxes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Sandboxes</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Run OpenClaw agents in isolated containers with network policies.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Create Sandbox
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
      ) : sandboxes.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
          <p className="text-[var(--text-secondary)] mb-2">No sandboxes yet</p>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            Create a sandbox to run OpenClaw agents safely in an isolated environment.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            Create Your First Sandbox
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sandboxes.map(sb => (
            <div key={sb.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[sb.status] || 'bg-gray-400'}`} />
                  <div>
                    <span className="font-medium text-[var(--text)]">{sb.name}</span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-2">{sb.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                    {POLICY_LABELS[sb.policy] || sb.policy}
                  </span>

                  {sb.status === 'created' || sb.status === 'stopped' ? (
                    <button
                      onClick={() => handleAction(sb.id, 'start')}
                      disabled={actionLoading === sb.id}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    >
                      Start
                    </button>
                  ) : sb.status === 'running' ? (
                    <button
                      onClick={() => handleAction(sb.id, 'stop')}
                      disabled={actionLoading === sb.id}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                    >
                      Stop
                    </button>
                  ) : null}

                  <button
                    onClick={() => handleAction(sb.id, 'remove')}
                    disabled={actionLoading === sb.id}
                    className="px-3 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3 flex gap-4 text-xs text-[var(--text-tertiary)]">
                <span>Image: {sb.config?.image || 'node:22-slim'}</span>
                <span>Created: {new Date(sb.created_at).toLocaleDateString()}</span>
                {sb.started_at && <span>Started: {new Date(sb.started_at).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateSandboxModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

function CreateSandboxModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [policy, setPolicy] = useState('api-only')
  const [presets, setPresets] = useState<SandboxPreset[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    sandboxAPI.presets().then(setPresets).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) || name.length < 2) {
      setError('Name must be 2+ lowercase chars, numbers, hyphens')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await sandboxAPI.create(name.trim(), policy)
      onCreated()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Create Sandbox</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="my-agent"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Network Policy</label>
            <div className="space-y-2">
              {presets.map(p => (
                <label
                  key={p.name}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    policy === p.name
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="policy"
                    value={p.name}
                    checked={policy === p.name}
                    onChange={() => setPolicy(p.name)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">
                      {POLICY_LABELS[p.name] || p.name}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {p.description}
                    </div>
                    {p.allowed_hosts && p.allowed_hosts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.allowed_hosts.map(h => (
                          <span key={h} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-tertiary)] font-mono">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
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
              {submitting ? 'Creating...' : 'Create Sandbox'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
