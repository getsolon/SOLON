import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const DMG_URL = 'https://github.com/theodorthirtyseven37/SOLON/releases/latest/download/Solon.dmg'

function isMacOS(): boolean {
  return /Mac|Macintosh/.test(navigator.userAgent)
}

type Path = null | 'models' | 'agent' | 'selfhost'

export default function Onboarding() {
  const { user } = useAuth()
  const [path, setPath] = useState<Path>(null)
  const mac = isMacOS()

  function dismiss() {
    localStorage.setItem('solon-onboarding-dismissed', '1')
    window.location.href = '/instances'
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {path ? 'Install Solon to get started.' : 'What do you want to do?'}
          </p>
        </div>

        {!path ? (
          /* Path selection */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setPath('models')}
              className="text-left p-6 rounded-xl border border-[var(--border)] hover:border-brand-light/40 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 transition-colors"
            >
              <div className="text-2xl mb-3">💬</div>
              <h3 className="font-semibold text-[var(--text)] mb-1">Use AI Models</h3>
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                Proxy Claude, GPT, or run open-source models through one API.
              </p>
            </button>

            <button
              onClick={() => setPath('agent')}
              className="text-left p-6 rounded-xl border border-[var(--border)] hover:border-brand-light/40 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 transition-colors"
            >
              <div className="text-2xl mb-3">🤖</div>
              <h3 className="font-semibold text-[var(--text)] mb-1">Deploy an Agent</h3>
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                Autonomous agents with tools, sandboxes, and channel integrations.
              </p>
            </button>

            <button
              onClick={() => setPath('selfhost')}
              className="text-left p-6 rounded-xl border border-[var(--border)] hover:border-brand-light/40 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 transition-colors"
            >
              <div className="text-2xl mb-3">🖥️</div>
              <h3 className="font-semibold text-[var(--text)] mb-1">Self-Host</h3>
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                Run Solon on your Mac or server. Free and open-source forever.
              </p>
            </button>
          </div>
        ) : (
          /* Install instructions */
          <div className="max-w-lg mx-auto">
            {path === 'models' && (
              <div className="mb-6 p-4 rounded-xl bg-brand-light/10 border border-brand-light/20">
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong className="text-[var(--text)]">After installing:</strong> Open the dashboard, go to <strong>Providers</strong>, and add your Anthropic or OpenAI API key. You'll get an OpenAI-compatible endpoint instantly.
                </p>
              </div>
            )}

            {path === 'agent' && (
              <div className="mb-6 p-4 rounded-xl bg-brand-light/10 border border-brand-light/20">
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong className="text-[var(--text)]">After installing:</strong> Run <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs">solon openclaw</code> to start an AI agent with tools and web access. Or use the dashboard Setup wizard.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {mac && (
                <a
                  href={DMG_URL}
                  className="flex items-center justify-center gap-2 w-full bg-brand hover:bg-brand/90 text-white font-medium rounded-xl px-6 py-3 text-sm transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Solon for Mac
                </a>
              )}

              <div className="border border-[var(--border)] rounded-xl p-4 text-left">
                <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Install via CLI
                </p>
                <code className="block text-sm text-[var(--text)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 font-mono select-all">
                  curl -fsSL https://getsolon.dev | sh
                </code>
              </div>

              <div className="border border-[var(--border)] rounded-xl p-4 text-left">
                <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Then run
                </p>
                <code className="block text-sm text-[var(--text)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 font-mono select-all">
                  solon serve
                </code>
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                  Opens the dashboard at localhost:8420 with a guided setup wizard.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setPath(null)}
                className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={dismiss}
                className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Skip to Dashboard
              </button>
            </div>
          </div>
        )}

        {!path && (
          <div className="mt-8 text-center">
            <button
              onClick={dismiss}
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Skip to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
