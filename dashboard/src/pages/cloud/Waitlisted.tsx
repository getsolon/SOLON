import { useAuthStore } from '../../store/auth'
import Button from '../../components/Button'

const WAITLIST_FORM_URL = 'https://forms.gle/Qqoq6KJXRNpYiqXTA'

export default function Waitlisted() {
  const { user, logout } = useAuthStore()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-brand flex items-center justify-center">
          <span className="text-white font-bold text-2xl">S</span>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">We're building something great</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Thanks for signing up{user?.name ? `, ${user.name}` : ''}! Solon Cloud is currently in early access.
          Join the waitlist and we'll let you know when your account is ready.
        </p>

        <a
          href={WAITLIST_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
        >
          Join the Waitlist
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        <div className="mt-8">
          <button
            onClick={logout}
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
