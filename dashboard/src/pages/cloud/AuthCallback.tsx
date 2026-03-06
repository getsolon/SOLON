import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setToken } from '../../api/client'
import { useAuthStore } from '../../store/auth'
import Logo from '../../components/Logo'

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
      navigate('/', { replace: true })
    })
  }, [params, navigate, loadUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="text-center">
        <Logo size={40} className="mx-auto mb-3" />
        <p className="text-sm text-[var(--text-tertiary)]">Signing you in...</p>
      </div>
    </div>
  )
}
