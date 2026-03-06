import { Outlet } from 'react-router-dom'
import Logo from '../components/Logo'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo size={40} className="mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-[var(--text)]">Solon Cloud</h1>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow)]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
