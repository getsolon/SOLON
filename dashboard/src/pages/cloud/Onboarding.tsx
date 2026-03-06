import { useAuth } from '../../hooks/useAuth'
import Logo from '../../components/Logo'

const DMG_URL = 'https://github.com/theodorthirtyseven37/SOLON/releases/latest/download/Solon.dmg'

function isMacOS(): boolean {
  return /Mac|Macintosh/.test(navigator.userAgent)
}

export default function Onboarding() {
  const { user } = useAuth()
  const mac = isMacOS()

  function dismiss() {
    localStorage.setItem('solon-onboarding-dismissed', '1')
    window.location.href = '/instances'
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <Logo size={56} className="mx-auto mb-6" />

        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          Welcome{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Install Solon to run AI models locally on your machine.
        </p>

        <div className="space-y-4">
          {mac ? (
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
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">
              Desktop app available for macOS. Use the CLI to install on this platform.
            </p>
          )}

          <div className="border border-[var(--border)] rounded-xl p-4 text-left">
            <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Install via CLI
            </p>
            <code className="block text-sm text-[var(--text)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 font-mono select-all">
              curl -fsSL https://getsolon.dev | sh
            </code>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="mt-8 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Skip to Dashboard
        </button>
      </div>
    </div>
  )
}
