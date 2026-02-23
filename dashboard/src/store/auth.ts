import { create } from 'zustand'
import type { User } from '../api/types'
import { getToken, setToken, clearToken } from '../api/client'
import { cloudAPI } from '../api/cloud'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const res = await cloudAPI.login(email, password)
    setToken(res.token)
    set({ user: res.user })
  },

  register: async (name, email, password) => {
    const res = await cloudAPI.register(name, email, password)
    setToken(res.token)
    set({ user: res.user })
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
