import { useState, useEffect, useCallback } from 'react'
import { createInstanceAPI } from '../api/instance'
import type { HealthStatus, ModelInfo, APIKey, RequestLogEntry, UsageStats, InstanceAPI } from '../api/types'

interface InstanceData {
  health: HealthStatus | null
  models: ModelInfo[]
  keys: APIKey[]
  requests: RequestLogEntry[]
  usage: UsageStats | null
  loading: boolean
  error: string | null
}

export function useInstance(url: string, apiKey: string) {
  const [data, setData] = useState<InstanceData>({
    health: null,
    models: [],
    keys: [],
    requests: [],
    usage: null,
    loading: true,
    error: null,
  })

  const api: InstanceAPI = createInstanceAPI(url, apiKey)

  const refresh = useCallback(async () => {
    setData(d => ({ ...d, loading: true, error: null }))
    try {
      const [health, models, keys, requests, usage] = await Promise.all([
        api.health().catch(() => null),
        api.models().catch(() => []),
        api.keys.list().catch(() => []),
        api.analytics.requests().catch(() => []),
        api.analytics.usage().catch(() => null),
      ])
      setData({ health, models, keys, requests, usage, loading: false, error: null })
    } catch (e) {
      setData(d => ({ ...d, loading: false, error: (e as Error).message }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, apiKey])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...data, refresh, api }
}
