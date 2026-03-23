import { create } from 'zustand'
import { localAPI } from '../api/local'
import type { TunnelStatus } from '../api/types'

interface ServerState {
  version: string
  status: 'unknown' | 'online' | 'offline'
  tunnel: TunnelStatus | null
  totalMemoryMB: number
  fetch: () => Promise<void>
}

export const useServerStore = create<ServerState>((set) => ({
  version: '',
  status: 'unknown',
  tunnel: null,
  totalMemoryMB: 0,

  fetch: async () => {
    try {
      const health = await localAPI.health()
      set({ version: health.version, status: health.status === 'ok' ? 'online' : 'offline' })
    } catch {
      set({ status: 'offline' })
    }
    try {
      const system = await localAPI.system()
      set({ totalMemoryMB: system.total_memory_mb })
    } catch {
      // system endpoint may not be available
    }
    try {
      const tunnel = await localAPI.tunnel.status()
      set({ tunnel })
    } catch {
      // tunnel endpoint may not be available
    }
  },
}))
