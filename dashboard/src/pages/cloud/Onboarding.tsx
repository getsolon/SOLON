import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

type Path = null | 'local-models' | 'agent' | 'gpu'

function isMacOS(): boolean {
  return /Mac|Macintosh/.test(navigator.userAgent)
}

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
            {!path ? 'What do you want to run?' : 'Get started in under 5 minutes.'}
          </p>
        </div>

        {!path ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stream 1: Local models */}
            <button
              onClick={() => setPath('local-models')}
              className="text-left p-6 rounded-xl border border-[var(--border)] hover:border-brand-light/40 bg-[var(--bg-secondary)] transition-colors"
            >
              <svg className="mb-3 text-[var(--text)]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
              <h3 className="font-semibold text-[var(--text)] mb-1">Run open-source models</h3>
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                Llama, Gemma, Mistral on your Mac or Linux machine. Free forever.
              </p>
            </button>

            {/* Stream 2: OpenClaw agent */}
            <button
              onClick={() => setPath('agent')}
              className="text-left p-6 rounded-xl border border-[var(--border)] hover:border-brand-light/40 bg-[var(--bg-secondary)] transition-colors"
            >
              <svg className="mb-3 text-[var(--text)]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0112 4.5V7h-1a7 7 0 00-7 7H3a1 1 0 00-1 1v2a1 1 0 001 1h1.27a7 7 0 0013.46 0H19a1 1 0 001-1v-2a1 1 0 00-1-1h-1a7 7 0 00-7-7h-1V4.5A2.5 2.5 0 0112.5 2" /><circle cx="9" cy="14" r="1" fill="currentColor" /><circle cx="15" cy="14" r="1" fill="currentColor" /></svg>
              <h3 className="font-semibold text-[var(--text)] mb-1">Run an AI agent</h3>
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                OpenClaw agent in a secure sandbox. Tools, web access, tiered security.
              </p>
            </button>

            {/* Stream 3: Large models on GPU (coming soon) */}
            <button
              onClick={() => setPath('gpu')}
              className="text-left p-6 rounded-xl border border-[var(--border)] hover:border-brand-light/40 bg-[var(--bg-secondary)] transition-colors relative"
            >
              <svg className="mb-3 text-[var(--text)]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="2" x2="9" y2="4" /><line x1="15" y1="2" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="22" /><line x1="15" y1="20" x2="15" y2="22" /><line x1="20" y1="9" x2="22" y2="9" /><line x1="20" y1="15" x2="22" y2="15" /><line x1="2" y1="9" x2="4" y2="9" /><line x1="2" y1="15" x2="4" y2="15" /></svg>
              <h3 className="font-semibold text-[var(--text)] mb-1">Run large models on GPU</h3>
              <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
                Llama 70B, Mixtral on dedicated A100 or H100 hardware. Managed for you.
              </p>
            </button>
          </div>
        ) : path === 'gpu' ? (
          /* GPU — coming soon */
          <div className="max-w-lg mx-auto text-center">
            <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
              <svg className="mx-auto mb-4 text-[var(--text-tertiary)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="2" x2="9" y2="4" /><line x1="15" y1="2" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="22" /><line x1="15" y1="20" x2="15" y2="22" /><line x1="20" y1="9" x2="22" y2="9" /><line x1="20" y1="15" x2="22" y2="15" /><line x1="2" y1="9" x2="4" y2="9" /><line x1="2" y1="15" x2="4" y2="15" /></svg>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Managed GPU hosting</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                Dedicated A100, H100, and H200 servers with Solon pre-installed. Run 70B+ parameter models without managing infrastructure.
              </p>
              <p className="text-sm text-[var(--text-tertiary)] mb-6">
                Starting at $3.49/hr. Coming soon.
              </p>
              <a
                href="mailto:hello@getsolon.dev?subject=GPU%20Hosting%20Early%20Access"
                className="inline-block bg-brand text-white font-semibold rounded-lg px-6 py-2.5 text-sm hover:opacity-90 transition-opacity"
              >
                Get early access
              </a>
            </div>
            <button
              onClick={() => setPath(null)}
              className="mt-6 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              ← Back
            </button>
          </div>
        ) : (
          /* Install instructions for streams 1 & 2 */
          <div className="max-w-lg mx-auto">
            {path === 'local-models' && (
              <div className="mb-6 p-4 rounded-xl bg-brand-light/10 border border-brand-light/20">
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong className="text-[var(--text)]">After installing:</strong> Run <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs font-mono">solon serve</code>, then pull a model from the dashboard. Your API is live at <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs font-mono">localhost:8420</code>.
                </p>
              </div>
            )}

            {path === 'agent' && (
              <div className="mb-6 p-4 rounded-xl bg-brand-light/10 border border-brand-light/20">
                <p className="text-sm text-[var(--text-secondary)] mb-2">
                  <strong className="text-[var(--text)]">Requires:</strong> Docker installed on your machine.
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  <strong className="text-[var(--text)]">After installing:</strong> Add your Anthropic API key in Providers, then run <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs font-mono">solon openclaw</code>. Agent starts in a secure sandbox.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {mac ? (
                <>
                  <div className="border border-[var(--border)] rounded-xl p-4 text-left">
                    <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                      Install via Homebrew
                    </p>
                    <code className="block text-sm text-[var(--text)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 font-mono select-all">
                      brew install solon
                    </code>
                  </div>
                  <div className="text-center text-xs text-[var(--text-tertiary)]">or</div>
                </>
              ) : null}

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
