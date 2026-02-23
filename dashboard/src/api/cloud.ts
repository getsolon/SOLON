import type { AuthResponse, User, BillingInfo, TeamMember, CloudAPIToken } from './types'

// Mock cloud API — replaced with real backend later

const MOCK_USER: User = {
  id: 'usr_1',
  name: 'Demo User',
  email: 'demo@getsolon.dev',
  plan: 'pro',
  created_at: '2025-12-01T00:00:00Z',
}

const MOCK_TOKEN = 'mock_jwt_token_solon_cloud'

function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const cloudAPI = {
  async login(email: string, _password: string): Promise<AuthResponse> {
    await delay()
    return {
      token: MOCK_TOKEN,
      user: { ...MOCK_USER, email },
    }
  },

  async register(name: string, email: string, _password: string): Promise<AuthResponse> {
    await delay()
    return {
      token: MOCK_TOKEN,
      user: { ...MOCK_USER, id: 'usr_' + Date.now(), name, email },
    }
  },

  async getProfile(): Promise<User> {
    await delay(100)
    return { ...MOCK_USER }
  },

  async updateProfile(data: { name?: string; email?: string }): Promise<User> {
    await delay()
    return { ...MOCK_USER, ...data }
  },

  async changePassword(_current: string, _newPass: string): Promise<void> {
    await delay()
  },

  async getBilling(): Promise<BillingInfo> {
    await delay(200)
    return {
      plan: 'pro',
      status: 'active',
      current_period_end: '2026-03-15T00:00:00Z',
      usage: {
        instances: { used: 2, limit: 10 },
        requests: { used: 12847, limit: 100000 },
        team_members: { used: 1, limit: 1 },
      },
      payment_method: {
        type: 'visa',
        last4: '4242',
        exp: '12/27',
      },
    }
  },

  async getTeamMembers(): Promise<TeamMember[]> {
    await delay(200)
    return [
      {
        id: 'usr_1',
        name: 'Demo User',
        email: 'demo@getsolon.dev',
        role: 'owner',
        joined_at: '2025-12-01T00:00:00Z',
        last_active: new Date().toISOString(),
      },
    ]
  },

  async inviteTeamMember(_email: string, _role: 'admin' | 'member'): Promise<TeamMember> {
    await delay()
    return {
      id: 'usr_' + Date.now(),
      name: 'Invited User',
      email: _email,
      role: _role,
      joined_at: new Date().toISOString(),
    }
  },

  async removeTeamMember(_id: string): Promise<void> {
    await delay()
  },

  async getAPITokens(): Promise<CloudAPIToken[]> {
    await delay(200)
    return [
      {
        id: 'tok_1',
        name: 'CI/CD Pipeline',
        prefix: 'sol_cloud_...a1b2',
        created_at: '2026-01-15T00:00:00Z',
        last_used: '2026-02-20T14:30:00Z',
      },
    ]
  },

  async createAPIToken(_name: string): Promise<{ token: string; id: string }> {
    await delay()
    return {
      id: 'tok_' + Date.now(),
      token: 'sol_cloud_' + Math.random().toString(36).slice(2),
    }
  },

  async revokeAPIToken(_id: string): Promise<void> {
    await delay()
  },

  async deleteAccount(): Promise<void> {
    await delay()
  },
}
