import { fetchJSON } from './client'
import type { InstanceAPI, HealthStatus, ModelInfo, APIKey, RequestLogEntry, UsageStats, TunnelStatus } from './types'

// Remote instance API — calls ${tunnelUrl}/api/v1/* with Bearer auth

export function createInstanceAPI(baseUrl: string, apiKey: string): InstanceAPI {
  const url = baseUrl.replace(/\/$/, '')

  function authedFetch<T>(path: string, opts?: RequestInit): Promise<T> {
    return fetchJSON<T>(`${url}${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...opts?.headers,
      },
    })
  }

  return {
    health: () => authedFetch<HealthStatus>('/api/v1/health'),

    models: () =>
      authedFetch<{ models: ModelInfo[] }>('/api/v1/models').then(r => r.models || []),

    keys: {
      list: () =>
        authedFetch<{ keys: APIKey[] }>('/api/v1/keys').then(r => r.keys || []),
      create: (name: string) =>
        authedFetch<{ key: string; name: string; id: string }>('/api/v1/keys', {
          method: 'POST',
          body: JSON.stringify({ name }),
        }),
      revoke: (id: string) =>
        authedFetch<{ status: string }>(`/api/v1/keys/${id}`, { method: 'DELETE' }),
    },

    analytics: {
      requests: () =>
        authedFetch<{ requests: RequestLogEntry[] }>('/api/v1/analytics/requests').then(r => r.requests || []),
      usage: () => authedFetch<UsageStats>('/api/v1/analytics/usage'),
    },

    tunnel: {
      status: () => authedFetch<TunnelStatus>('/api/v1/tunnel/status'),
      enable: () => authedFetch<TunnelStatus>('/api/v1/tunnel/enable', { method: 'POST' }),
      disable: () => authedFetch<{ status: string }>('/api/v1/tunnel/disable', { method: 'POST' }),
    },
  }
}
