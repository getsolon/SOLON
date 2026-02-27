import { Hono } from 'hono'
import type { Env, UserRow } from '../types'
import { badRequest, notFound, conflict } from '../lib/errors'

type Variables = { userId: string; userPlan: string; userRole: string }

const profile = new Hono<{ Bindings: Env; Variables: Variables }>()

function userResponse(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    plan: row.plan,
    avatar_url: row.avatar_url,
    role: row.role,
    provider: row.github_id ? 'github' : row.google_id ? 'google' : null,
    created_at: row.created_at,
  }
}

// GET /profile
profile.get('/', async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>()
  if (!user) throw notFound('User not found')
  return c.json(userResponse(user))
})

// PATCH /profile
profile.patch('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ name?: string; email?: string }>()

  const updates: string[] = []
  const values: string[] = []

  if (body.name !== undefined) {
    updates.push('name = ?')
    values.push(body.name.trim())
  }
  if (body.email !== undefined) {
    const email = body.email.toLowerCase().trim()
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(email, userId).first()
    if (existing) throw conflict('Email already in use')
    updates.push('email = ?')
    values.push(email)
  }

  if (updates.length === 0) throw badRequest('No fields to update')

  updates.push("updated_at = datetime('now')")
  values.push(userId)

  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()

  const user = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>())!
  return c.json(userResponse(user))
})

// DELETE /profile
profile.delete('/', async (c) => {
  const userId = c.get('userId')
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
  return c.json({ ok: true })
})

export default profile
