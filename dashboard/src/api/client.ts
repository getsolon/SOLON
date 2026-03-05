import { isDesktopApp } from '../lib/mode'

const CLOUD_TOKEN_KEY = 'solon-cloud-token'
const CLOUD_API_BASE = 'https://api.getsolon.dev'

function cloudApiUrl(path: string): string {
  if (isDesktopApp()) return `${CLOUD_API_BASE}/api${path}`
  return `/api${path}`
}

export function getToken(): string | null {
  return localStorage.getItem(CLOUD_TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(CLOUD_TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(CLOUD_TOKEN_KEY)
}

export async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(err.error?.message || err.error || res.statusText)
  }
  return res.json()
}

let refreshing: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch(cloudApiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json() as { token?: string }
    if (data.token) {
      setToken(data.token)
      return data.token
    }
    return null
  } catch {
    return null
  }
}

export async function cloudFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken()
  const url = cloudApiUrl(path)
  const res = await fetch(url, {
    ...opts,
    credentials: opts?.credentials || 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  })

  if (res.status === 401) {
    // Try refresh (deduplicate concurrent refresh attempts)
    if (!refreshing) refreshing = tryRefresh()
    const newToken = await refreshing
    refreshing = null

    if (newToken) {
      // Retry original request with new token
      const retry = await fetch(url, {
        ...opts,
        credentials: opts?.credentials || 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...opts?.headers,
        },
      })
      if (retry.ok) return retry.json()
    }

    // Refresh failed — redirect to login
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }

  return res.json()
}
