import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import AppLayout from './layouts/AppLayout'

import Home from './pages/Home'
import Models from './pages/instance/Models'
import Keys from './pages/instance/Keys'
import Providers from './pages/instance/Providers'
import Sandboxes from './pages/instance/Sandboxes'
import Activity from './pages/instance/Activity'
import InstanceSettings from './pages/instance/InstanceSettings'

export default function App() {
  useTheme()

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/models" element={<Models />} />
        <Route path="/keys" element={<Keys />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/sandboxes" element={<Sandboxes />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/settings" element={<InstanceSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
