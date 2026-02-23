import { fetchJSON } from './client'
import type { InstanceAPI, HealthStatus, ModelInfo, APIKey, RequestLogEntry, UsageStats, TunnelStatus } from './types'

// Local instance API — same-origin calls, no auth headers needed
// Go's LocalhostOrAuth middleware handles authentication for localhost

export const localAPI: InstanceAPI = {
  health: () => fetchJSON<HealthStatus>('/api/v1/health'),

  models: () =>
    fetchJSON<{ models: ModelInfo[] }>('/api/v1/models').then(r => r.models || []),

  keys: {
    list: () =>
      fetchJSON<{ keys: APIKey[] }>('/api/v1/keys').then(r => r.keys || []),
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
