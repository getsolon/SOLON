export interface Env {
  DB: D1Database
  KV: KVNamespace
  JWT_SECRET: string
  ENCRYPTION_KEY: string
}

export interface UserRow {
  id: string
  name: string
  email: string
  password: string
  plan: string
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

export interface JWTPayload {
  sub: string
  plan: string
  iat: number
  exp: number
}
