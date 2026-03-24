import { useState, useEffect } from 'react'
import { useInstanceContext } from '../contexts/InstanceContext'
import { useServerStore } from '../store/server'
import Card from '../components/Card'
import Setup from './instance/Setup'
import { providerAPI, sandboxAPI } from '../api/local'
import { fetchJSON } from '../api/client'
import type { UsageStats, ModelInfo } from '../api/types'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--text)]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{sub}</p>}
    </Card>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function Home() {
  const { api } = useInstanceContext()
  const status = useServerStore(s => s.status)
  const version = useServerStore(s => s.version)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [hasProviders, setHasProviders] = useState<boolean | null>(null)

  useEffect(() => {
    Promise.all([
      api.analytics.usage().then(setStats).catch(() => {}),
      api.models().then(setModels).catch(() => {}),
      providerAPI.list().then(p => setHasProviders(p.length > 0)).catch(() => setHasProviders(false)),
    ]).finally(() => setLoading(false))
  }, [api])

  const isOnline = status === 'online'
  const hasActivity = stats && stats.total_requests > 0
  const hasModels = models.length > 0

  // Show guided setup wizard when no providers and no models (fresh install)
  if (!loading && hasProviders === false && !hasModels && !hasActivity) {
    return <Setup onComplete={() => { setShowSetup(false); setHasProviders(true) }} />
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
      </main>
    )
  }

  // First-run: no models, no requests → show get started card
  if (!hasModels && !hasActivity) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse-dot' : 'bg-red-500'}`} />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            {isOnline ? 'Solon is running' : 'Solon'}
          </h1>
          {version && <span className="text-xs font-mono text-[var(--text-tertiary)]">v{version}</span>}
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">Get Started</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Pull your first model to start using Solon. Try one of these:
          </p>
          <div className="space-y-2 font-mono text-sm">
            <p className="bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg px-3 py-2 text-[var(--text)]">
              solon models pull llama3.2:3b
            </p>
            <p className="bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg px-3 py-2 text-[var(--text)]">
              solon models pull mistral:7b
            </p>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Or go to the Models page to browse and install from the library.
          </p>
        </Card>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse-dot' : 'bg-red-500'}`} />
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Dashboard</h1>
        {version && <span className="text-xs font-mono text-[var(--text-tertiary)]">v{version}</span>}
      </div>

      {/* OpenClaw launch card */}
      {hasProviders && <OpenClawCard />}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Requests Today"
          value={stats ? formatNumber(stats.requests_today) : '0'}
        />
        <StatCard
          label="Total Tokens"
          value={stats ? formatNumber(stats.total_tokens_in + stats.total_tokens_out) : '0'}
          sub={stats ? `${formatNumber(stats.total_tokens_in)} in / ${formatNumber(stats.total_tokens_out)} out` : undefined}
        />
        <StatCard
          label="Avg Latency"
          value={stats && stats.avg_latency_ms > 0 ? `${Math.round(stats.avg_latency_ms)}ms` : '—'}
        />
        <StatCard
          label="Most Used"
          value={stats?.most_used_model || '—'}
        />
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Requests"
          value={stats ? formatNumber(stats.total_requests) : '0'}
        />
        <StatCard
          label="API Keys Active"
          value={stats ? String(stats.unique_keys_used) : '0'}
        />
        <StatCard
          label="Models Installed"
          value={String(models.length)}
        />
      </div>
    </main>
  )
}

function OpenClawCard() {
  const [launching, setLaunching] = useState(false)
  const [status, setStatus] = useState<{ running: boolean; sandbox?: { status: string } } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJSON<{ available: boolean; running: boolean; sandbox?: { status: string } }>('/api/v1/openclaw/status')
      .then(setStatus)
      .catch(() => {})
  }, [])

  const handleLaunch = async () => {
    setLaunching(true)
    setError('')
    try {
      await fetchJSON('/api/v1/openclaw/start', { method: 'POST' })
      // Refresh status
      const s = await fetchJSON<{ available: boolean; running: boolean; sandbox?: { status: string } }>('/api/v1/openclaw/status')
      setStatus(s)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLaunching(false)
    }
  }

  const isRunning = status?.running

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">&#x1F99E;</span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">OpenClaw</h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              {isRunning ? 'Running in secure sandbox' : 'AI agent framework — run safely in a sandbox'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Running
            </span>
          )}
          <button
            onClick={handleLaunch}
            disabled={launching}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 ${
              isRunning
                ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                : 'bg-[var(--accent)] text-white hover:opacity-90'
            }`}
          >
            {launching ? 'Starting...' : isRunning ? 'Restart' : 'Launch OpenClaw'}
          </button>
        </div>
      </div>
      {isRunning && (
        <p className="mt-3 text-xs text-[var(--text-tertiary)] font-mono bg-[var(--bg)] rounded-lg px-3 py-2">
          solon openclaw
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </Card>
  )
}
