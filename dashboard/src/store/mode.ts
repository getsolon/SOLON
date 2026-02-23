import { create } from 'zustand'
import type { AppMode } from '../lib/mode'
import { detectLocalAvailability, hasCloudToken, deriveMode } from '../lib/mode'

interface ModeState {
  mode: AppMode
  localAvailable: boolean
  loading: boolean
  init: () => Promise<void>
}

export const useModeStore = create<ModeState>((set) => ({
  mode: 'local',
  localAvailable: false,
  loading: true,

  init: async () => {
    const localAvailable = await detectLocalAvailability()
    const cloudToken = hasCloudToken()
    const mode = deriveMode(localAvailable, cloudToken)
    set({ mode, localAvailable, loading: false })
  },
}))
