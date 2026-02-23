// Cloud API types

export interface User {
  id: string
  name: string
  email: string
  plan: 'free' | 'pro' | 'team' | 'enterprise'
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

// Solon instance types (shared between local + remote)

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

// InstanceAPI — common interface for local + remote instance clients

export interface InstanceAPI {
  health: () => Promise<HealthStatus>
  models: () => Promise<ModelInfo[]>
  keys: {
    list: () => Promise<APIKey[]>
    create: (name: string) => Promise<{ key: string; name: string; id: string }>
    revoke: (id: string) => Promise<{ status: string }>
  }
  analytics: {
    requests: () => Promise<RequestLogEntry[]>
    usage: () => Promise<UsageStats>
  }
  tunnel: {
    status: () => Promise<TunnelStatus>
    enable: () => Promise<TunnelStatus>
    disable: () => Promise<{ status: string }>
  }
}

// Cloud-specific types

export interface Instance {
  id: string
  name: string
  url: string
  api_key: string
  status: 'online' | 'offline' | 'unknown'
  version?: string
  models_count?: number
  added_at: string
}

export interface BillingInfo {
  plan: 'free' | 'pro' | 'team' | 'enterprise'
  status: 'active' | 'past_due' | 'canceled'
  current_period_end: string
  usage: {
    instances: { used: number; limit: number }
    requests: { used: number; limit: number }
    team_members: { used: number; limit: number }
  }
  payment_method?: {
    type: string
    last4: string
    exp: string
  }
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  last_active?: string
}

export interface CloudAPIToken {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used?: string
}

// Chat types

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}

export interface Conversation {
  id: string
  title: string
  model: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface ChatCompletionChunk {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }[]
}
