import { useState, useEffect } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import TopBar from '../../components/TopBar'
import Card from '../../components/Card'
import Button from '../../components/Button'
import type { HealthStatus, TunnelStatus } from '../../api/types'

export default function InstanceSettings() {
  const { api, instanceName } = useInstanceContext()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [tunnel, setTunnel] = useState<TunnelStatus | null>(null)
  const [tunnelLoading, setTunnelLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.health().then(setHealth).catch(e => setError(e.message))
    api.tunnel.status().then(setTunnel).catch(() => {})
  }, [api])

  const toggleTunnel = async () => {
    setTunnelLoading(true)
    setError('')
    try {
      if (tunnel?.enabled) {
        await api.tunnel.disable()
      } else {
        await api.tunnel.enable()
      }
      const status = await api.tunnel.status()
      setTunnel(status)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setTunnelLoading(false)
    }
  }

  return (
    <>
      <TopBar title={`${instanceName} Settings`} />
      <main className="p-4 lg:p-6 space-y-6 max-w-2xl">
        {error && (
          <div className="rounded-lg bg-[var(--bg-error)] px-4 py-3 text-sm text-[var(--red)]">
            {error}
          </div>
        )}

        <Card className="p-6">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Server Info</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
              <span className="text-sm text-[var(--text-tertiary)]">Status</span>
              <span className="text-sm font-medium text-[var(--text)]">{health?.status === 'ok' ? 'Running' : 'Offline'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[var(--text-tertiary)]">Version</span>
              <span className="text-sm font-medium text-[var(--text)]">{health?.version || '—'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Secure Tunnel</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
              <span className="text-sm text-[var(--text-tertiary)]">Status</span>
              <span className="text-sm font-medium text-[var(--text)]">{tunnel?.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            {tunnel?.enabled && tunnel.url && (
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
                <span className="text-sm text-[var(--text-tertiary)]">URL</span>
                <span className="text-sm font-medium text-[var(--text)] font-mono">{tunnel.url}</span>
              </div>
            )}
            {tunnel?.enabled && tunnel.provider && (
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
                <span className="text-sm text-[var(--text-tertiary)]">Provider</span>
                <span className="text-sm font-medium text-[var(--text)]">{tunnel.provider}</span>
              </div>
            )}
            <div className="pt-2">
              <Button
                variant={tunnel?.enabled ? 'danger' : 'primary'}
                size="sm"
                onClick={toggleTunnel}
                disabled={tunnelLoading}
              >
                {tunnelLoading ? 'Working...' : tunnel?.enabled ? 'Disable Tunnel' : 'Enable Tunnel'}
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </>
  )
}
