export interface Env {
  DB: D1Database
  KV: KVNamespace
  JWT_SECRET: string
  ENCRYPTION_KEY: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  ADMIN_GITHUB_ID: string
  ADMIN_EMAIL: string
  DASHBOARD_URL: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  PROVISIONER_URL: string
  PROVISIONER_SECRET: string
}

export interface UserRow {
  id: string
  name: string
  email: string
  password: string
  plan: string
  github_id: string | null
  google_id: string | null
  avatar_url: string | null
  role: string
  created_at: string
  updated_at: string
}

export interface RefreshTokenRow {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  created_at: string
}

export interface InstanceRow {
  id: string
  user_id: string
  team_id: string | null
  name: string
  url: string
  api_key_enc: string
  status: string
  version: string | null
  models_count: number
  added_at: string
}

export interface ApiTokenRow {
  id: string
  user_id: string
  name: string
  prefix: string
  token_hash: string
  last_used: string | null
  created_at: string
}

export interface TeamRow {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface TeamMemberRow {
  id: string
  team_id: string
  user_id: string | null
  email: string
  role: string
  status: string
  invited_by: string | null
  joined_at: string
  last_active: string | null
}

export interface ManagedInstanceRow {
  id: string
  user_id: string
  name: string
  tier: string
  status: string
  hetzner_server_id: string | null
  ipv4: string | null
  region: string
  solon_api_key_enc: string | null
  dashboard_url: string | null
  stripe_subscription_id: string | null
  provisioning_job_id: string | null
  created_at: string
  ready_at: string | null
  deleted_at: string | null
  updated_at: string
}

export interface JWTPayload {
  sub: string
  plan: string
  role: string
  iat: number
  exp: number
}
