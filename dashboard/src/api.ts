const BASE = ''

// Dashboard talks to Solon API without auth (localhost-only access)
// In production, dashboard requests bypass auth middleware

async function fetchJSON<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(err.error?.message || res.statusText)
  }
  return res.json()
}

export interface HealthStatus {
  status: string
  version: string
}

export interface ModelInfo {
  name: string
  size: number
  format: string
  family: string
  params: string
  quantization: string
  modified: string
}

export interface APIKey {
  id: string
  name: string
  prefix: string
  scope: string
  rate_limit: number
  created_at: string
  last_used?: string
}

export interface RequestLogEntry {
  id: number
  key_id: string
  method: string
  path: string
  model: string
  tokens_in: number
  tokens_out: number
  latency_ms: number
  status_code: number
  created_at: string
}

export interface UsageStats {
  total_requests: number
  total_tokens_in: number
  total_tokens_out: number
  avg_latency_ms: number
  requests_today: number
  unique_keys_used: number
  most_used_model: string
}

export interface TunnelStatus {
  enabled: boolean
  url?: string
  provider?: string
}

export const api = {
  health: () => fetchJSON<HealthStatus>('/api/v1/health'),

  models: () => fetchJSON<{ models: ModelInfo[] }>('/api/v1/models').then(r => r.models || []),

  keys: {
    list: () => fetchJSON<{ keys: APIKey[] }>('/api/v1/keys').then(r => r.keys || []),
    create: (name: string) =>
      fetchJSON<{ key: string; name: string; id: string }>('/api/v1/keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    revoke: (id: string) =>
      fetchJSON<{ status: string }>(`/api/v1/keys/${id}`, { method: 'DELETE' }),
  },

  analytics: {
    requests: () =>
      fetchJSON<{ requests: RequestLogEntry[] }>('/api/v1/analytics/requests').then(r => r.requests || []),
    usage: () => fetchJSON<UsageStats>('/api/v1/analytics/usage'),
  },

  tunnel: {
    status: () => fetchJSON<TunnelStatus>('/api/v1/tunnel/status'),
    enable: () => fetchJSON<TunnelStatus>('/api/v1/tunnel/enable', { method: 'POST' }),
    disable: () => fetchJSON<{ status: string }>('/api/v1/tunnel/disable', { method: 'POST' }),
  },
}
