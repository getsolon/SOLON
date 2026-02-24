import { create } from 'zustand'
import type { Instance } from '../api/types'
import { cloudAPI } from '../api/cloud'
import { getToken } from '../api/client'

const STORAGE_KEY = 'solon-cloud-instances'

function loadLocal(): Instance[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveLocal(instances: Instance[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instances))
}

function isCloudMode(): boolean {
  return !!getToken()
}

interface InstancesState {
  instances: Instance[]
  load: () => Promise<void>
  add: (name: string, url: string, apiKey: string) => Promise<Instance>
  remove: (id: string) => Promise<void>
  updateStatus: (id: string, status: Instance['status'], version?: string, modelsCount?: number) => void
}

export const useInstancesStore = create<InstancesState>((set, get) => ({
  instances: [],

  load: async () => {
    if (isCloudMode()) {
      try {
        const instances = await cloudAPI.getInstances()
        saveLocal(instances) // offline cache
        set({ instances })
        return
      } catch {
        // Fall back to localStorage cache
      }
    }
    set({ instances: loadLocal() })
  },

  add: async (name, url, apiKey) => {
    if (isCloudMode()) {
      const instance = await cloudAPI.addInstance(name, url, apiKey)
      const updated = [...get().instances, instance]
      saveLocal(updated)
      set({ instances: updated })
      return instance
    }
    const instance: Instance = {
      id: 'inst_' + Date.now(),
      name,
      url: url.replace(/\/$/, ''),
      api_key: apiKey,
      status: 'unknown',
      added_at: new Date().toISOString(),
    }
    const updated = [...get().instances, instance]
    saveLocal(updated)
    set({ instances: updated })
    return instance
  },

  remove: async (id) => {
    if (isCloudMode()) {
      await cloudAPI.removeInstance(id)
    }
    const updated = get().instances.filter(i => i.id !== id)
    saveLocal(updated)
    set({ instances: updated })
  },

  updateStatus: (id, status, version, modelsCount) => {
    const updated = get().instances.map(i =>
      i.id === id ? { ...i, status, version, models_count: modelsCount } : i
    )
    saveLocal(updated)
    set({ instances: updated })
  },
}))
