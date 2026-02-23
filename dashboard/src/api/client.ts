const CLOUD_TOKEN_KEY = 'solon-cloud-token'

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

export async function cloudFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  })

  if (res.status === 401) {
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
