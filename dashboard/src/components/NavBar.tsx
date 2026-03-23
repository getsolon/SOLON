import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useServerStore } from '../store/server'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/models', label: 'Models' },
  { to: '/keys', label: 'API Keys' },
  { to: '/activity', label: 'Activity' },
]

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const version = useServerStore(s => s.version)

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-lg bg-[var(--bg)]/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + nav */}
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2.5">
              <Logo size={24} glow />
              <span className="font-extrabold tracking-tight text-[var(--text)]">Solon</span>
              {version && (
                <span className="text-[10px] text-[var(--text-tertiary)] font-mono ml-0.5">v{version}</span>
              )}
            </NavLink>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'text-[var(--text)] font-medium'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text)]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <a
                href="https://www.getsolon.dev/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1"
              >
                Docs
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7" /><path d="M7 7h10v10" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right: settings gear + theme toggle + mobile hamburger */}
          <div className="flex items-center gap-1">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `hidden md:flex p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-[var(--text)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
                }`
              }
              title="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </NavLink>
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileOpen ? (
                  <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                ) : (
                  <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)]">
          <div className="px-4 py-3 space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'text-[var(--text)] font-medium bg-[var(--bg-hover)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="my-2 border-t border-[var(--border)]" />
            <NavLink
              to="/settings"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-[var(--text)] font-medium bg-[var(--bg-hover)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text)]'
                }`
              }
            >
              Settings
            </NavLink>
            <a
              href="https://www.getsolon.dev/docs"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1"
            >
              Docs
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" /><path d="M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
