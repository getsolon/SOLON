import { Hono } from 'hono'
import type { Env, UserRow } from '../types'
import { sha256 } from '../lib/password'
import { signJWT } from '../lib/jwt'
import { userId, refreshTokenId, deviceTokenId } from '../lib/id'
import { badRequest, unauthorized, forbidden } from '../lib/errors'
import {
  generateState,
  githubAuthURL,
  exchangeGitHubCode,
  fetchGitHubProfile,
  googleAuthURL,
  exchangeGoogleCode,
  fetchGoogleProfile,
  type OAuthUserProfile,
} from '../lib/oauth'

const auth = new Hono<{ Bindings: Env }>()

function userResponse(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    plan: row.plan,
    avatar_url: row.avatar_url,
    role: row.role,
    created_at: row.created_at,
  }
}

async function generateTokens(user: UserRow, env: Env) {
  const accessToken = await signJWT(
    {
      sub: user.id,
      plan: user.plan,
      role: user.role,
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
  return `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Domain=.getsolon.dev; Path=/api/auth; Max-Age=${maxAge}`
}

function clearRefreshCookie(): string {
  return 'refresh_token=; HttpOnly; Secure; SameSite=Lax; Domain=.getsolon.dev; Path=/api/auth; Max-Age=0'
}

async function generateDeviceToken(user: UserRow, env: Env): Promise<{ accessToken: string; deviceToken: string }> {
  const accessToken = await signJWT(
    {
      sub: user.id,
      plan: user.plan,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 min
    },
    env.JWT_SECRET,
  )

  const tokenBytes = new Uint8Array(64)
  crypto.getRandomValues(tokenBytes)
  const deviceToken = Array.from(tokenBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  const tokenHash = await sha256(deviceToken)

  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
  await env.DB.prepare('INSERT INTO device_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(deviceTokenId(), user.id, tokenHash, expiresAt)
    .run()

  return { accessToken, deviceToken }
}

function determineRole(
  provider: 'github' | 'google',
  profile: OAuthUserProfile,
  env: Env,
): string {
  if (provider === 'github' && profile.id === env.ADMIN_GITHUB_ID) return 'admin'
  if (provider === 'google' && profile.email && profile.email === env.ADMIN_EMAIL) return 'admin'
  return 'user'
}

async function handleOAuthCallback(
  provider: 'github' | 'google',
  profile: OAuthUserProfile,
  env: Env,
): Promise<{ user: UserRow; accessToken: string; refreshToken: string }> {
  const providerIdCol = provider === 'github' ? 'github_id' : 'google_id'

  // Check for existing user by provider ID
  let user = await env.DB.prepare(`SELECT * FROM users WHERE ${providerIdCol} = ?`)
    .bind(profile.id)
    .first<UserRow>()

  if (user) {
    // Update profile on each login
    await env.DB.prepare(
      `UPDATE users SET name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(profile.name, profile.avatar_url, user.id)
      .run()
    user = (await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>())!
  } else {
    // Check if user exists by email (link accounts)
    if (profile.email) {
      user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
        .bind(profile.email.toLowerCase())
        .first<UserRow>()
    }

    if (user) {
      // Link this provider to existing email-matched user
      await env.DB.prepare(
        `UPDATE users SET ${providerIdCol} = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(profile.id, profile.avatar_url, user.id)
        .run()
      user = (await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>())!
    } else {
      // Create new user
      const id = userId()
      const role = determineRole(provider, profile, env)
      const now = new Date().toISOString()

      await env.DB.prepare(
        `INSERT INTO users (id, name, email, password, ${providerIdCol}, avatar_url, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, profile.name, profile.email?.toLowerCase() || '', 'oauth_no_password', profile.id, profile.avatar_url, role, now, now)
        .run()

      user = (await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>())!
    }
  }

  const { accessToken, refreshToken } = await generateTokens(user, env)
  return { user, accessToken, refreshToken }
}

// GET /auth/github — redirect to GitHub OAuth
auth.get('/github', async (c) => {
  const desktop = c.req.query('desktop') === 'true'
  const state = generateState()
  await c.env.KV.put(`oauth_state:${state}`, JSON.stringify({ provider: 'github', desktop }), { expirationTtl: 300 })

  const url = githubAuthURL(c.env.GITHUB_CLIENT_ID, state)
  return c.redirect(url)
})

// GET /auth/google — redirect to Google OAuth
auth.get('/google', async (c) => {
  const desktop = c.req.query('desktop') === 'true'
  const state = generateState()
  await c.env.KV.put(`oauth_state:${state}`, JSON.stringify({ provider: 'google', desktop }), { expirationTtl: 300 })

  const callbackUrl = new URL('/api/auth/callback/google', c.req.url).toString()
  const url = googleAuthURL(c.env.GOOGLE_CLIENT_ID, callbackUrl, state)
  return c.redirect(url)
})

// GET /auth/callback/github — GitHub OAuth callback
auth.get('/callback/github', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) throw badRequest('Missing code or state')

  // Verify CSRF state
  const storedRaw = await c.env.KV.get(`oauth_state:${state}`)
  if (!storedRaw) throw badRequest('Invalid or expired state')
  const stored = JSON.parse(storedRaw) as { provider: string; desktop: boolean }
  if (stored.provider !== 'github') throw badRequest('Invalid or expired state')
  await c.env.KV.delete(`oauth_state:${state}`)

  const accessToken = await exchangeGitHubCode(code, c.env.GITHUB_CLIENT_ID, c.env.GITHUB_CLIENT_SECRET)
  const profile = await fetchGitHubProfile(accessToken)
  const result = await handleOAuthCallback('github', profile, c.env)

  if (stored.desktop) {
    const { deviceToken } = await generateDeviceToken(result.user, c.env)
    return new Response(null, {
      status: 302,
      headers: { Location: `solon://auth/callback?device_token=${deviceToken}` },
    })
  }

  const dashboardUrl = c.env.DASHBOARD_URL || 'https://app.getsolon.dev'
  const redirectUrl = `${dashboardUrl}/auth/callback?token=${result.accessToken}`

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': setRefreshCookie(result.refreshToken),
    },
  })
})

// GET /auth/callback/google — Google OAuth callback
auth.get('/callback/google', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) throw badRequest('Missing code or state')

  // Verify CSRF state
  const storedRaw = await c.env.KV.get(`oauth_state:${state}`)
  if (!storedRaw) throw badRequest('Invalid or expired state')
  const stored = JSON.parse(storedRaw) as { provider: string; desktop: boolean }
  if (stored.provider !== 'google') throw badRequest('Invalid or expired state')
  await c.env.KV.delete(`oauth_state:${state}`)

  const callbackUrl = new URL('/api/auth/callback/google', c.req.url).toString()
  const oauthToken = await exchangeGoogleCode(code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, callbackUrl)
  const profile = await fetchGoogleProfile(oauthToken)
  const result = await handleOAuthCallback('google', profile, c.env)

  if (stored.desktop) {
    const { deviceToken } = await generateDeviceToken(result.user, c.env)
    return new Response(null, {
      status: 302,
      headers: { Location: `solon://auth/callback?device_token=${deviceToken}` },
    })
  }

  const dashboardUrl = c.env.DASHBOARD_URL || 'https://app.getsolon.dev'
  const redirectUrl = `${dashboardUrl}/auth/callback?token=${result.accessToken}`

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      'Set-Cookie': setRefreshCookie(result.refreshToken),
    },
  })
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

// POST /auth/device/refresh — refresh a device token (desktop app)
auth.post('/device/refresh', async (c) => {
  const body = await c.req.json<{ device_token?: string }>()
  if (!body.device_token) throw badRequest('Missing device_token')

  const hash = await sha256(body.device_token)
  const row = await c.env.DB.prepare(
    "SELECT dt.*, u.* FROM device_tokens dt JOIN users u ON u.id = dt.user_id WHERE dt.token_hash = ? AND dt.expires_at > datetime('now')",
  )
    .bind(hash)
    .first<UserRow & { token_hash: string; expires_at: string }>()

  if (!row) throw unauthorized('Invalid or expired device token')

  // Rotate: delete old, issue new
  await c.env.DB.prepare('DELETE FROM device_tokens WHERE token_hash = ?').bind(hash).run()
  const { accessToken, deviceToken } = await generateDeviceToken(row as UserRow, c.env)

  return c.json({ token: accessToken, device_token: deviceToken })
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
