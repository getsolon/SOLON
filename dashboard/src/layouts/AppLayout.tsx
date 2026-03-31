import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useInstancesStore } from '../store/instances'
import { useModeStore } from '../store/mode'
import { useServerStore } from '../store/server'

export default function AppLayout() {
  const load = useInstancesStore(s => s.load)
  const mode = useModeStore(s => s.mode)
  const fetchServer = useServerStore(s => s.fetch)

  useEffect(() => {
    if (mode !== 'local') {
      load()
    }
  }, [load, mode])

  useEffect(() => {
    if (mode !== 'cloud') {
      fetchServer()
    }
  }, [fetchServer, mode])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Outlet />
      </div>
    </div>
  )
}
