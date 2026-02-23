import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'
import { useModeStore } from '../store/mode'
import ThemeToggle from './ThemeToggle'

export default function TopBar({ title }: { title?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { setSidebarOpen } = useUIStore()
  const mode = useModeStore(s => s.mode)
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {title && <h1 className="text-lg font-semibold text-[var(--text)]">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {mode !== 'local' && user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-brand-light flex items-center justify-center text-white text-xs font-medium">
                {user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="hidden sm:inline">{user.name}</span>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-1 shadow-lg">
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    Settings
                  </button>
                  <hr className="my-1 border-[var(--border)]" />
                  <button
                    onClick={() => { setMenuOpen(false); logout(); navigate('/login') }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--red)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
