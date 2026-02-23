import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useInstancesStore } from '../store/instances'
import { useModeStore } from '../store/mode'

export default function AppLayout() {
  const load = useInstancesStore(s => s.load)
  const mode = useModeStore(s => s.mode)

  useEffect(() => {
    if (mode !== 'local') {
      load()
    }
  }, [load, mode])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="lg:pl-60">
        <Outlet />
      </div>
    </div>
  )
}
