export type AppMode = 'local' | 'cloud' | 'hybrid'

export async function detectLocalAvailability(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/health', { signal: AbortSignal.timeout(3000) })
    return res.ok
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
