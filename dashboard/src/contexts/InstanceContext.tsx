import { createContext, useContext } from 'react'
import type { InstanceAPI } from '../api/types'

interface InstanceContextValue {
  api: InstanceAPI
  instanceName: string
}

const InstanceContext = createContext<InstanceContextValue | null>(null)

export function InstanceProvider({ api, instanceName, children }: InstanceContextValue & { children: React.ReactNode }) {
  return (
    <InstanceContext.Provider value={{ api, instanceName }}>
      {children}
    </InstanceContext.Provider>
  )
}

export function useInstanceContext(): InstanceContextValue {
  const ctx = useContext(InstanceContext)
  if (!ctx) throw new Error('useInstanceContext must be used within InstanceProvider')
  return ctx
}
