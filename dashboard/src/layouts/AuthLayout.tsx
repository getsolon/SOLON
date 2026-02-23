import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-brand flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Solon Cloud</h1>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow)]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
