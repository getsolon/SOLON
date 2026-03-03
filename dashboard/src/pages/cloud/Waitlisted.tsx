import { useAuthStore } from '../../store/auth'

export default function Waitlisted() {
  const { user, logout } = useAuthStore()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-brand flex items-center justify-center">
          <span className="text-white font-bold text-2xl">S</span>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">You're on the waitlist</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Thanks for signing up{user?.name ? `, ${user.name}` : ''}! You'll get access once approved.
        </p>

        <button
          onClick={logout}
          className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
