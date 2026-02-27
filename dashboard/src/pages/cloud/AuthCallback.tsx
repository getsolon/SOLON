import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setToken } from '../../api/client'
import { useAuthStore } from '../../store/auth'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const loadUser = useAuthStore(s => s.loadUser)

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setToken(token)
    loadUser().then(() => {
      const { user } = useAuthStore.getState()
      if (user?.role === 'waitlisted') {
        navigate('/waitlisted', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    })
  }, [params, navigate, loadUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-brand flex items-center justify-center">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <p className="text-sm text-[var(--text-tertiary)]">Signing you in...</p>
      </div>
    </div>
  )
}
