import { useState } from 'react'
import Overview from './pages/Overview'
import Models from './pages/Models'
import Keys from './pages/Keys'
import RequestLog from './pages/RequestLog'
import Settings from './pages/Settings'

type Page = 'overview' | 'models' | 'keys' | 'requests' | 'settings'

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'models', label: 'Models' },
  { id: 'keys', label: 'API Keys' },
  { id: 'requests', label: 'Request Log' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [page, setPage] = useState<Page>('overview')

  return (
    <div style={styles.app}>
      <nav style={styles.sidebar}>
        <div style={styles.logo}>
          <h1 style={styles.logoText}>Solon</h1>
          <span style={styles.tagline}>Your AI. Your rules.</span>
        </div>
        <div style={styles.nav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                ...styles.navItem,
                ...(page === item.id ? styles.navItemActive : {}),
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={styles.version}>v0.1.0-dev</div>
      </nav>
      <main style={styles.main}>
        {page === 'overview' && <Overview />}
        {page === 'models' && <Models />}
        {page === 'keys' && <Keys />}
        {page === 'requests' && <RequestLog />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    color: '#1a1a2e',
    background: '#f8f9fb',
  },
  sidebar: {
    width: 220,
    background: '#1a1a2e',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    flexShrink: 0,
  },
  logo: {
    padding: '0 24px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoText: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
    display: 'block',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navItem: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    padding: '10px 12px',
    borderRadius: 8,
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  version: {
    padding: '16px 24px',
    fontSize: 12,
    opacity: 0.3,
  },
  main: {
    flex: 1,
    padding: 32,
    overflow: 'auto',
  },
}
