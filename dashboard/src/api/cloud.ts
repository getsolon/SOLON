import { cloudFetch } from './client'
import type { User, BillingInfo, TeamMember, CloudAPIToken, Instance } from './types'

export const cloudAPI = {
  async getProfile(): Promise<User> {
    return cloudFetch<User>('/profile')
  },

  async updateProfile(data: { name?: string; email?: string }): Promise<User> {
    return cloudFetch<User>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async getBilling(): Promise<BillingInfo> {
    return cloudFetch<BillingInfo>('/billing')
  },

  async getTeamMembers(): Promise<TeamMember[]> {
    return cloudFetch<TeamMember[]>('/team/members')
  },

  async inviteTeamMember(email: string, role: 'admin' | 'member'): Promise<TeamMember> {
    return cloudFetch<TeamMember>('/team/members', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    })
  },

  async removeTeamMember(id: string): Promise<void> {
    await cloudFetch(`/team/members/${id}`, { method: 'DELETE' })
  },

  async getAPITokens(): Promise<CloudAPIToken[]> {
    return cloudFetch<CloudAPIToken[]>('/tokens')
  },

  async createAPIToken(name: string): Promise<{ token: string; id: string }> {
    return cloudFetch<{ token: string; id: string }>('/tokens', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  async revokeAPIToken(id: string): Promise<void> {
    await cloudFetch(`/tokens/${id}`, { method: 'DELETE' })
  },

  async deleteAccount(): Promise<void> {
    await cloudFetch('/profile', { method: 'DELETE' })
  },

  // Instance management (cloud mode)
  async getInstances(): Promise<Instance[]> {
    return cloudFetch<Instance[]>('/instances')
  },

  async addInstance(name: string, url: string, apiKey: string): Promise<Instance> {
    return cloudFetch<Instance>('/instances', {
      method: 'POST',
      body: JSON.stringify({ name, url, api_key: apiKey }),
    })
  },

  async removeInstance(id: string): Promise<void> {
    await cloudFetch(`/instances/${id}`, { method: 'DELETE' })
  },

  async healthCheckInstance(id: string): Promise<{ status: string; version: string | null; models_count: number }> {
    return cloudFetch(`/instances/${id}/health`, { method: 'POST' })
  },
}
