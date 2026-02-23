import { create } from 'zustand'
import type { Instance } from '../api/types'

const STORAGE_KEY = 'solon-cloud-instances'

function loadInstances(): Instance[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveInstances(instances: Instance[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instances))
}

interface InstancesState {
  instances: Instance[]
  load: () => void
  add: (name: string, url: string, apiKey: string) => Instance
  remove: (id: string) => void
  updateStatus: (id: string, status: Instance['status'], version?: string, modelsCount?: number) => void
}

export const useInstancesStore = create<InstancesState>((set, get) => ({
  instances: [],

  load: () => {
    set({ instances: loadInstances() })
  },

  add: (name, url, apiKey) => {
    const instance: Instance = {
      id: 'inst_' + Date.now(),
      name,
      url: url.replace(/\/$/, ''),
      api_key: apiKey,
      status: 'unknown',
      added_at: new Date().toISOString(),
    }
    const updated = [...get().instances, instance]
    saveInstances(updated)
    set({ instances: updated })
    return instance
  },

  remove: (id) => {
    const updated = get().instances.filter(i => i.id !== id)
    saveInstances(updated)
    set({ instances: updated })
  },

  updateStatus: (id, status, version, modelsCount) => {
    const updated = get().instances.map(i =>
      i.id === id ? { ...i, status, version, models_count: modelsCount } : i
    )
    saveInstances(updated)
    set({ instances: updated })
  },
}))
