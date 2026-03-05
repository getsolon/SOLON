export type AppMode = 'local' | 'cloud' | 'hybrid'

export function isDesktopApp(): boolean {
  return '__TAURI_INTERNALS__' in window
}

export async function detectLocalAvailability(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/health', { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json')
  } catch {
    return false
  }
}

export function hasCloudToken(): boolean {
  return !!localStorage.getItem('solon-cloud-token')
}

export function deriveMode(localAvailable: boolean, cloudToken: boolean): AppMode {
  if (localAvailable && cloudToken) return 'hybrid'
  if (localAvailable) return 'local'
  return 'cloud'
}
