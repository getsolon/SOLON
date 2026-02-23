import { NavLink, useNavigate } from 'react-router-dom'
import { useUIStore } from '../store/ui'
import { useAuthStore } from '../store/auth'
import { useModeStore } from '../store/mode'
import { useInstancesStore } from '../store/instances'
import ThemeToggle from './ThemeToggle'

const localNavItems = [
  {
    to: '/instance/local/chat',
    label: 'Chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    to: '/instance/local',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/instance/local/models',
    label: 'Models',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    to: '/instance/local/keys',
    label: 'API Keys',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    to: '/instance/local/requests',
    label: 'Requests',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    to: '/instance/local/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

const accountNavItems = [
  {
    to: '/billing',
    label: 'Billing',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    to: '/team',
    label: 'Team',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

function NavItem({ to, label, icon, onClick }: { to: string; label: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const mode = useModeStore(s => s.mode)
  const user = useAuthStore(s => s.user)
  const instances = useInstancesStore(s => s.instances)
  const navigate = useNavigate()
  const plan = user?.plan || 'free'

  const showLocal = mode === 'local' || mode === 'hybrid'
  const showCloud = mode === 'cloud' || mode === 'hybrid'
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeSidebar} />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-full w-60 bg-brand text-white flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="h-8 w-8 rounded-lg bg-brand-light flex items-center justify-center font-bold text-sm">S</div>
          <div>
            <div className="font-semibold text-sm">
              {mode === 'cloud' ? 'Solon Cloud' : 'Solon'}
            </div>
            {showCloud && user ? (
              <div className="text-[10px] text-white/50 uppercase tracking-wider">{plan}</div>
            ) : (
              <div className="text-[10px] text-white/50 uppercase tracking-wider">Dashboard</div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {/* Local instance section */}
          {showLocal && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-white/40 uppercase tracking-wider">
                Local Instance
              </p>
              {localNavItems.map(item => (
                <NavItem key={item.to} {...item} onClick={closeSidebar} />
              ))}
            </>
          )}

          {/* Remote instances section */}
          {showCloud && user && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] font-medium text-white/40 uppercase tracking-wider flex items-center justify-between">
                <span>{mode === 'cloud' ? 'Instances' : 'Remote Instances'}</span>
                <button
                  onClick={() => { closeSidebar(); navigate('/instances') }}
                  className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
                >
                  Manage
                </button>
              </p>
              {instances.length === 0 ? (
                <button
                  onClick={() => { closeSidebar(); navigate('/instances') }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors w-full"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Add instance
                </button>
              ) : (
                instances.map(inst => (
                  <NavLink
                    key={inst.id}
                    to={`/instances/${inst.id}`}
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`
                    }
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      inst.status === 'online' ? 'bg-green-400' : inst.status === 'offline' ? 'bg-red-400' : 'bg-gray-400'
                    }`} />
                    {inst.name}
                  </NavLink>
                ))
              )}

              {/* Account section */}
              <p className="px-3 pt-4 pb-1 text-[10px] font-medium text-white/40 uppercase tracking-wider">
                Account
              </p>
              {accountNavItems.map(item => (
                <NavItem key={item.to} {...item} onClick={closeSidebar} />
              ))}
            </>
          )}
        </div>

        {/* Bottom bar */}
        <div className="px-3 py-4 border-t border-white/10 flex items-center justify-between">
          <ThemeToggle />
          {showLocal && !user && mode === 'local' && (
            <button
              onClick={() => { closeSidebar(); navigate('/login') }}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Sign in to Cloud &rarr;
            </button>
          )}
          {showLocal && !user && mode === 'local' && (
            <span className="text-[11px] text-white/25">v0.1.0</span>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-brand-light flex items-center justify-center text-white text-[10px] font-medium">
                {user.name?.charAt(0).toUpperCase() || '?'}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
