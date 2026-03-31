import { Outlet } from 'react-router-dom'
import { InstanceProvider } from '../contexts/InstanceContext'
import type { InstanceAPI } from '../api/types'

interface InstanceLayoutProps {
  api: InstanceAPI
  instanceName: string
}

export default function InstanceLayout({ api, instanceName }: InstanceLayoutProps) {
  return (
    <InstanceProvider api={api} instanceName={instanceName}>
      <Outlet />
    </InstanceProvider>
  )
}
