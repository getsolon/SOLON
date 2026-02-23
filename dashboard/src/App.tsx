import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import { useModeStore } from './store/mode'
import { localAPI } from './api/local'
import { InstanceProvider } from './contexts/InstanceContext'
import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'

// Instance pages (shared between local and remote)
import Chat from './pages/instance/Chat'
import Overview from './pages/instance/Overview'
import Models from './pages/instance/Models'
import Keys from './pages/instance/Keys'
import Requests from './pages/instance/Requests'
import InstanceSettings from './pages/instance/InstanceSettings'

// Cloud pages
import Login from './pages/cloud/Login'
import Register from './pages/cloud/Register'
import Instances from './pages/cloud/Instances'
import InstanceDetail from './pages/cloud/InstanceDetail'
import Billing from './pages/cloud/Billing'
import Team from './pages/cloud/Team'
import AccountSettings from './pages/cloud/AccountSettings'

function RequireLocal({ children }: { children: React.ReactNode }) {
  const mode = useModeStore(s => s.mode)
  if (mode === 'cloud') return <Navigate to="/instances" replace />
  return <>{children}</>
}

function RequireCloudAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const mode = useModeStore(s => s.mode)
  if (mode === 'local') return <Navigate to="/instance/local" replace />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function RootRedirect() {
  const mode = useModeStore(s => s.mode)
  const { user } = useAuth()

  if (mode === 'local') return <Navigate to="/instance/local/chat" replace />
  if (mode === 'hybrid') return <Navigate to="/instance/local/chat" replace />
  // cloud mode
  if (user) return <Navigate to="/instances" replace />
  return <Navigate to="/login" replace />
}

function LocalInstanceWrapper({ children }: { children: React.ReactNode }) {
  return (
    <InstanceProvider api={localAPI} instanceName="Local Instance">
      {children}
    </InstanceProvider>
  )
}

export default function App() {
  useTheme()
  const { loading: authLoading } = useAuth()
  const { loading: modeLoading, init } = useModeStore()

  useEffect(() => {
    init()
  }, [init])

  if (modeLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-brand flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Auth routes (cloud-only) */}
      <Route element={<RequireGuest><AuthLayout /></RequireGuest>}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* App routes */}
      <Route element={<AppLayout />}>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Local instance routes */}
        <Route path="/instance/local/chat" element={<RequireLocal><LocalInstanceWrapper><Chat /></LocalInstanceWrapper></RequireLocal>} />
        <Route path="/instance/local" element={<RequireLocal><LocalInstanceWrapper><Overview /></LocalInstanceWrapper></RequireLocal>} />
        <Route path="/instance/local/models" element={<RequireLocal><LocalInstanceWrapper><Models /></LocalInstanceWrapper></RequireLocal>} />
        <Route path="/instance/local/keys" element={<RequireLocal><LocalInstanceWrapper><Keys /></LocalInstanceWrapper></RequireLocal>} />
        <Route path="/instance/local/requests" element={<RequireLocal><LocalInstanceWrapper><Requests /></LocalInstanceWrapper></RequireLocal>} />
        <Route path="/instance/local/settings" element={<RequireLocal><LocalInstanceWrapper><InstanceSettings /></LocalInstanceWrapper></RequireLocal>} />

        {/* Cloud routes */}
        <Route path="/instances" element={<RequireCloudAuth><Instances /></RequireCloudAuth>} />
        <Route path="/instances/:id" element={<RequireCloudAuth><InstanceDetail /></RequireCloudAuth>}>
          <Route index element={<Overview />} />
          <Route path="chat" element={<Chat />} />
          <Route path="models" element={<Models />} />
          <Route path="keys" element={<Keys />} />
          <Route path="requests" element={<Requests />} />
          <Route path="settings" element={<InstanceSettings />} />
        </Route>
        <Route path="/billing" element={<RequireCloudAuth><Billing /></RequireCloudAuth>} />
        <Route path="/team" element={<RequireCloudAuth><Team /></RequireCloudAuth>} />
        <Route path="/settings" element={<RequireCloudAuth><AccountSettings /></RequireCloudAuth>} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
