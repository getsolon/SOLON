import { useEffect } from 'react'
import { useAuthStore } from '../store/auth'

export function useAuth() {
  const { user, loading, loadUser, logout } = useAuthStore()

  useEffect(() => {
    loadUser()
  }, [loadUser])

  return { user, loading, logout }
}
