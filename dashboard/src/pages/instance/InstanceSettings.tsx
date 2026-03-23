import { useState, useEffect } from 'react'
import { useInstanceContext } from '../../contexts/InstanceContext'
import { generateQRCodeSVG } from '../../lib/qr'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import type { HealthStatus, TunnelStatus, RemoteStatus } from '../../api/types'

export default function InstanceSettings() {
  const { api } = useInstanceContext()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [tunnel, setTunnel] = useState<TunnelStatus | null>(null)
  const [remote, setRemote] = useState<RemoteStatus | null>(null)
  const [tunnelLoading, setTunnelLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.health().then(setHealth).catch(e => setError(e.message))
    api.tunnel.status().then(setTunnel).catch(() => {})
    api.remote.status().then(setRemote).catch(() => {})
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

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Determine which remote access method is active
  const activeURL = remote?.enabled ? remote.url : tunnel?.enabled ? tunnel.url : null
  const isRemoteActive = remote?.enabled || tunnel?.enabled

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Settings</h1>

      {error && (
        <div className="rounded-lg bg-[var(--bg-error)] px-4 py-3 text-sm text-[var(--red)]">
          {error}
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-base font-semibold text-[var(--text)] mb-4">Server Info</h3>
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

      {/* Remote Access — primary card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--text)]">Remote Access</h3>
          {remote?.enabled && <Badge variant="green">Connected</Badge>}
          {!remote?.enabled && tunnel?.enabled && <Badge variant="blue">Tunnel</Badge>}
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Access your local AI from anywhere. Use the URL below with your API key.
        </p>

        <div className="space-y-3">
          {/* Show relay status if connected */}
          {remote?.enabled && remote.url && (
            <>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
                <span className="text-sm text-[var(--text-tertiary)]">URL</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text)] font-mono">{remote.url}</span>
                  <CopyButton copied={copied} onClick={() => copyUrl(remote.url!)} />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
                <span className="text-sm text-[var(--text-tertiary)]">Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-[var(--text)]">Connected via Solon Relay</span>
                </div>
              </div>
            </>
          )}

          {/* Show tunnel status if that's what's active */}
          {!remote?.enabled && tunnel?.enabled && tunnel.url && (
            <>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
                <span className="text-sm text-[var(--text-tertiary)]">URL</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text)] font-mono">{tunnel.url}</span>
                  <CopyButton copied={copied} onClick={() => copyUrl(tunnel.url!)} />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
                <span className="text-sm text-[var(--text-tertiary)]">Provider</span>
                <span className="text-sm font-medium text-[var(--text)]">Cloudflare Tunnel</span>
              </div>
            </>
          )}

          {/* QR code for active URL */}
          {activeURL && (
            <div className="flex flex-col items-center py-4">
              <div
                className="bg-white p-3 rounded-lg"
                dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(activeURL) }}
              />
              <span className="mt-2 text-xs text-[var(--text-tertiary)]">Scan to connect</span>
            </div>
          )}

          {/* Not connected */}
          {!isRemoteActive && (
            <div className="py-4 text-center space-y-3">
              <p className="text-sm text-[var(--text-tertiary)]">
                Remote access is not enabled. Start Solon with <code className="font-mono bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-xs">--remote</code> to connect via Solon Relay.
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Or enable a Cloudflare tunnel as an alternative:
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={toggleTunnel}
                disabled={tunnelLoading}
              >
                {tunnelLoading ? 'Connecting...' : 'Enable Tunnel'}
              </Button>
            </div>
          )}

          {/* Disable tunnel button */}
          {!remote?.enabled && tunnel?.enabled && (
            <div className="pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={toggleTunnel}
                disabled={tunnelLoading}
              >
                {tunnelLoading ? 'Working...' : 'Disable Tunnel'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Usage hint */}
      {activeURL && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-[var(--text)] mb-3">Quick Start</h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Use with any OpenAI-compatible client:</p>
          <div className="font-mono text-xs bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg px-4 py-3 text-[var(--text)] overflow-x-auto whitespace-pre">{`curl ${activeURL}/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"llama3.2:3b","messages":[{"role":"user","content":"Hello"}]}'`}</div>
        </Card>
      )}
    </main>
  )
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
      title="Copy URL"
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}
