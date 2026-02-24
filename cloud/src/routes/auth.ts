import { Hono } from 'hono'
import type { Env, UserRow } from '../types'
import { hashPassword, verifyPassword, sha256 } from '../lib/password'
import { signJWT } from '../lib/jwt'
import { userId, refreshTokenId } from '../lib/id'
import { badRequest, unauthorized, conflict } from '../lib/errors'

const auth = new Hono<{ Bindings: Env }>()

function userResponse(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    plan: row.plan,
    created_at: row.created_at,
  }
}

async function generateTokens(user: UserRow, env: Env) {
  const accessToken = await signJWT(
    {
      sub: user.id,
      plan: user.plan,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 min
    },
    env.JWT_SECRET,
  )

  // Generate refresh token
  const refreshBytes = new Uint8Array(64)
  crypto.getRandomValues(refreshBytes)
  const refreshToken = Array.from(refreshBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  const refreshHash = await sha256(refreshToken)

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await env.DB.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(refreshTokenId(), user.id, refreshHash, expiresAt)
    .run()

  return { accessToken, refreshToken }
}

function setRefreshCookie(refreshToken: string): string {
  const maxAge = 30 * 24 * 60 * 60 // 30 days
  return `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${maxAge}`
}

function clearRefreshCookie(): string {
  return 'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0'
}

// POST /auth/register
auth.post('/register', async (c) => {
  const body = await c.req.json<{ name?: string; email?: string; password?: string }>()
  if (!body.name || !body.email || !body.password) throw badRequest('name, email, and password are required')
  if (body.password.length < 8) throw badRequest('Password must be at least 8 characters')

  const email = body.email.toLowerCase().trim()
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) throw conflict('Email already registered')

  const id = userId()
  const hash = await hashPassword(body.password)
  const now = new Date().toISOString()

  await c.env.DB.prepare('INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, body.name.trim(), email, hash, now, now)
    .run()

  const user = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>())!
  const { accessToken, refreshToken } = await generateTokens(user, c.env)

  return c.json(
    { token: accessToken, user: userResponse(user) },
    201,
    { 'Set-Cookie': setRefreshCookie(refreshToken) },
  )
})

// POST /auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>()
  if (!body.email || !body.password) throw badRequest('email and password are required')

  const email = body.email.toLowerCase().trim()
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>()
  if (!user) throw unauthorized('Invalid email or password')

  const valid = await verifyPassword(body.password, user.password)
  if (!valid) throw unauthorized('Invalid email or password')

  const { accessToken, refreshToken } = await generateTokens(user, c.env)

  return c.json(
    { token: accessToken, user: userResponse(user) },
    200,
    { 'Set-Cookie': setRefreshCookie(refreshToken) },
  )
})

// POST /auth/refresh
auth.post('/refresh', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/refresh_token=([a-f0-9]+)/)
  if (!match) throw unauthorized('No refresh token')

  const refreshToken = match[1]
  const hash = await sha256(refreshToken)

  const row = await c.env.DB.prepare(
    "SELECT rt.*, u.* FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')",
  )
    .bind(hash)
    .first<UserRow & { token_hash: string; expires_at: string }>()

  if (!row) throw unauthorized('Invalid or expired refresh token')

  // Rotate: delete old, issue new
  await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').bind(hash).run()

  const { accessToken, refreshToken: newRefreshToken } = await generateTokens(row as UserRow, c.env)

  return c.json(
    { token: accessToken },
    200,
    { 'Set-Cookie': setRefreshCookie(newRefreshToken) },
  )
})

// DELETE /auth/logout
auth.delete('/logout', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/refresh_token=([a-f0-9]+)/)

  if (match) {
    const hash = await sha256(match[1])
    await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').bind(hash).run()
  }

  return c.json({ ok: true }, 200, { 'Set-Cookie': clearRefreshCookie() })
})

export default auth
