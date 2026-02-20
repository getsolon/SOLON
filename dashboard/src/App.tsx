import { useState, useEffect } from 'react'
import Overview from './pages/Overview'
import Models from './pages/Models'
import Keys from './pages/Keys'
import RequestLog from './pages/RequestLog'
import Settings from './pages/Settings'

type Page = 'overview' | 'models' | 'keys' | 'requests' | 'settings'

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◎' },
  { id: 'models', label: 'Models', icon: '◆' },
  { id: 'keys', label: 'API Keys', icon: '⚷' },
  { id: 'requests', label: 'Requests', icon: '⇄' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('solon-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('solon-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: 240,
        background: 'var(--bg-sidebar)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Solon</div>
          <div style={{ fontSize: 11, opacity: 0.35, marginTop: 4, letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>
            Dashboard
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                background: page === item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                color: page === item.id ? '#fff' : 'rgba(255,255,255,0.5)',
                padding: '10px 14px',
                borderRadius: 10,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: page === item.id ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (page !== item.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                }
              }}
              onMouseLeave={e => {
                if (page !== item.id) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                }
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Bottom: theme toggle + version */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, opacity: 0.25 }}>v0.1.0-dev</span>
          <button
            onClick={() => setDark(!dark)}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {dark ? '☀' : '☾'}
            <span style={{ fontSize: 11 }}>{dark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px 40px', overflow: 'auto', maxWidth: 1100 }}>
        {page === 'overview' && <Overview />}
        {page === 'models' && <Models />}
        {page === 'keys' && <Keys />}
        {page === 'requests' && <RequestLog />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  )
}
