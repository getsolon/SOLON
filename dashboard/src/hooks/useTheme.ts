import { useEffect } from 'react'
import { useUIStore } from '../store/ui'

export function useTheme() {
  const { theme, setTheme } = useUIStore()

  useEffect(() => {
    const saved = localStorage.getItem('solon-theme') as 'light' | 'dark' | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(saved || preferred)
  }, [setTheme])

  return theme
}
