import { useState, useEffect, useRef, useCallback } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import { useModeStore } from '../../store/mode'
import { pullModel } from '../../api/local'
import TopBar from '../../components/TopBar'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import Card from '../../components/Card'
import Button from '../../components/Button'
import type { ModelInfo, DownloadProgress } from '../../api/types'

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

function formatSpeed(bytesPerSec: number): string {
  const mb = bytesPerSec / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB/s`
  const kb = bytesPerSec / 1024
  return `${kb.toFixed(0)} KB/s`
}

interface PullState {
  pulling: boolean
  file: string
  downloaded: number
  total: number
  percent: number
  speed: number
  error: string | null
}

export default function Models() {
  const { api } = useInstanceContext()
  const mode = useModeStore(s => s.mode)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [pullInput, setPullInput] = useState('')
  const [pull, setPull] = useState<PullState>({
    pulling: false, file: '', downloaded: 0, total: 0, percent: 0, speed: 0, error: null,
  })

  const abortRef = useRef<AbortController | null>(null)
  const speedRef = useRef({ lastBytes: 0, lastTime: 0, ema: 0 })

  const showPullUI = mode === 'local' || mode === 'hybrid'

  const refreshModels = useCallback(() => {
    api.models().then(setModels).catch(() => {})
  }, [api])

  useEffect(() => {
    api.models()
      .then(setModels)
      .finally(() => setLoading(false))
  }, [api])

  const handlePull = () => {
    const name = pullInput.trim()
    if (!name || pull.pulling) return

    setPull({ pulling: true, file: '', downloaded: 0, total: 0, percent: 0, speed: 0, error: null })
    speedRef.current = { lastBytes: 0, lastTime: Date.now(), ema: 0 }

    abortRef.current = pullModel(name, {
      onProgress: (p: DownloadProgress) => {
        const now = Date.now()
        const sr = speedRef.current
        const elapsed = (now - sr.lastTime) / 1000
        if (elapsed >= 0.5 && p.downloaded > sr.lastBytes) {
          const instant = (p.downloaded - sr.lastBytes) / elapsed
          sr.ema = sr.ema === 0 ? instant : 0.3 * instant + 0.7 * sr.ema
          sr.lastBytes = p.downloaded
          sr.lastTime = now
        }

        setPull(prev => ({
          ...prev,
          file: p.file || prev.file,
          downloaded: p.downloaded,
          total: p.total,
          percent: p.percent,
          speed: sr.ema,
        }))
      },
      onDone: () => {
        setPull(prev => ({ ...prev, pulling: false }))
        setPullInput('')
        refreshModels()
      },
      onError: (message: string) => {
        setPull(prev => ({ ...prev, pulling: false, error: message }))
      },
    })
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setPull(prev => ({ ...prev, pulling: false }))
  }

  return (
    <>
      <TopBar title="Models" />
      <main className="p-4 lg:p-6 space-y-4">
        {/* Pull UI */}
        {showPullUI && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Pull Model</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={pullInput}
                onChange={e => setPullInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePull()}
                placeholder="e.g. llama3.2:8b"
                disabled={pull.pulling}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-light/50 disabled:opacity-50"
              />
              <Button onClick={handlePull} disabled={pull.pulling || !pullInput.trim()} size="md">
                {pull.pulling ? 'Pulling...' : 'Pull Model'}
              </Button>
            </div>

            {/* Progress bar */}
            {pull.pulling && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span className="truncate max-w-[200px]">{pull.file || 'Starting...'}</span>
                  <span>{pull.percent.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-light transition-[width] duration-300"
                    style={{ width: `${Math.min(pull.percent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                  <span>{formatSize(pull.downloaded)} / {formatSize(pull.total)}</span>
                  <div className="flex items-center gap-3">
                    {pull.speed > 0 && <span>{formatSpeed(pull.speed)}</span>}
                    <button
                      onClick={handleCancel}
                      className="text-[var(--red)] hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {pull.error && (
              <div className="mt-3 rounded-lg bg-[var(--bg-error)] px-4 py-2 text-sm text-[var(--red)] flex items-center justify-between">
                <span>{pull.error}</span>
                <button
                  onClick={() => setPull(prev => ({ ...prev, error: null }))}
                  className="text-xs underline ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}
          </Card>
        )}

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading models...</p>
        ) : models.length === 0 ? (
          <EmptyState
            title="No models installed"
            description={showPullUI ? 'Use the pull input above to download a model.' : 'Pull a model to get started.'}
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
              </svg>
            }
          />
        ) : (
          <DataTable
            columns={[
              { key: 'name', header: 'Name', render: (r: ModelInfo) => <span className="font-medium">{r.name}</span> },
              { key: 'size', header: 'Size', render: (r: ModelInfo) => formatSize(r.size) },
              { key: 'family', header: 'Family', render: (r: ModelInfo) => r.family || '—' },
              { key: 'params', header: 'Params', render: (r: ModelInfo) => r.params || '—' },
              { key: 'quantization', header: 'Quantization', render: (r: ModelInfo) => r.quantization || '—' },
            ]}
            data={models}
            emptyMessage="No models loaded"
          />
        )}
      </main>
    </>
  )
}
