import { Hono } from 'hono'
import type { Env, UserRow } from '../types'
import { badRequest, forbidden, notFound } from '../lib/errors'

type Variables = { userId: string; userPlan: string; userRole: string }

const admin = new Hono<{ Bindings: Env; Variables: Variables }>()

function userResponse(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_url: row.avatar_url,
    role: row.role,
    provider: row.github_id ? 'github' : row.google_id ? 'google' : null,
    created_at: row.created_at,
  }
}

// GET /admin/users
admin.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM users ORDER BY created_at DESC',
  ).all<UserRow>()

  return c.json(results.map(userResponse))
})

// PATCH /admin/users/:id
admin.patch('/users/:id', async (c) => {
  const adminId = c.get('userId')
  const targetId = c.req.param('id')
  const body = await c.req.json<{ role?: string }>()

  if (!body.role || !['user', 'waitlisted'].includes(body.role)) {
    throw badRequest('role must be "user" or "waitlisted"')
  }

  if (targetId === adminId) throw forbidden('Cannot change your own role')

  const target = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(targetId)
    .first<UserRow>()
  if (!target) throw notFound('User not found')
  if (target.role === 'admin') throw forbidden('Cannot change another admin\'s role')

  await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
    .bind(body.role, targetId)
    .run()

  return c.json({ ...userResponse(target), role: body.role })
})

// DELETE /admin/users/:id
admin.delete('/users/:id', async (c) => {
  const adminId = c.get('userId')
  const targetId = c.req.param('id')

  if (targetId === adminId) throw forbidden('Cannot delete your own account')

  const target = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(targetId)
    .first<UserRow>()
  if (!target) throw notFound('User not found')
  if (target.role === 'admin') throw forbidden('Cannot delete an admin account')

  // Cascade delete related data
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM api_tokens WHERE user_id = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM team_members WHERE user_id = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM instances WHERE user_id = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId),
  ])

  return c.json({ ok: true })
})

export default admin
