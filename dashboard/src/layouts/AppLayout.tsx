import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { InstanceProvider } from '../contexts/InstanceContext'
import { localAPI } from '../api/local'
import { useServerStore } from '../store/server'

export default function AppLayout() {
  const fetchServer = useServerStore(s => s.fetch)

  useEffect(() => {
    fetchServer()
  }, [fetchServer])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavBar />
      <InstanceProvider api={localAPI} instanceName="Solon">
        <Outlet />
      </InstanceProvider>
    </div>
  )
}
