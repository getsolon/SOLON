import { create } from 'zustand'
import type { User } from '../api/types'
import { getToken, setToken, clearToken } from '../api/client'
import { cloudAPI } from '../api/cloud'

interface AuthState {
  user: User | null
  loading: boolean
  setUserFromToken: (token: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUserFromToken: async (token) => {
    setToken(token)
    const user = await cloudAPI.getProfile()
    set({ user })
  },

  logout: () => {
    clearToken()
    set({ user: null })
  },

  loadUser: async () => {
    const token = getToken()
    if (!token) {
      set({ loading: false })
      return
    }
    try {
      const user = await cloudAPI.getProfile()
      set({ user, loading: false })
    } catch {
      clearToken()
      set({ user: null, loading: false })
    }
  },
}))
