import { useState, useEffect } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import TopBar from '../../components/TopBar'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import type { ModelInfo } from '../../api/types'

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

export default function Models() {
  const { api } = useInstanceContext()
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.models()
      .then(setModels)
      .finally(() => setLoading(false))
  }, [api])

  return (
    <>
      <TopBar title="Models" />
      <main className="p-4 lg:p-6 space-y-4">
        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading models...</p>
        ) : models.length === 0 ? (
          <EmptyState
            title="No models installed"
            description="Pull a model to get started."
            icon={
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
              </svg>
            }
            action={
              <code className="text-sm bg-[var(--bg-code)] px-3 py-1.5 rounded-lg font-mono text-[var(--text)]">
                solon models pull llama3.2:8b
              </code>
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
