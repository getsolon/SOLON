import { Hono } from 'hono'
import type { Env, TeamRow, TeamMemberRow, UserRow } from '../types'
import { teamId, memberId } from '../lib/id'
import { getPlanLimits } from '../lib/plans'
import { badRequest, notFound, forbidden } from '../lib/errors'

type Variables = { userId: string; userPlan: string }

const team = new Hono<{ Bindings: Env; Variables: Variables }>()

async function getOrCreateTeam(userId: string, db: D1Database): Promise<TeamRow | null> {
  // Check if user owns a team
  let t = await db.prepare('SELECT * FROM teams WHERE owner_id = ?').bind(userId).first<TeamRow>()
  if (t) return t

  // Check if user is a member of a team
  const membership = await db.prepare(
    "SELECT t.* FROM teams t JOIN team_members tm ON tm.team_id = t.id WHERE tm.user_id = ? AND tm.status = 'active'",
  )
    .bind(userId)
    .first<TeamRow>()
  if (membership) return membership

  return null
}

async function ensureTeam(userId: string, userName: string, db: D1Database): Promise<TeamRow> {
  let t = await db.prepare('SELECT * FROM teams WHERE owner_id = ?').bind(userId).first<TeamRow>()
  if (t) return t

  // Auto-create team
  const id = teamId()
  await db.prepare('INSERT INTO teams (id, name, owner_id) VALUES (?, ?, ?)').bind(id, `${userName}'s Team`, userId).run()

  // Add owner as member
  await db.prepare(
    "INSERT INTO team_members (id, team_id, user_id, email, role, status) VALUES (?, ?, ?, (SELECT email FROM users WHERE id = ?), 'owner', 'active')",
  )
    .bind(memberId(), id, userId, userId)
    .run()

  return (await db.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first<TeamRow>())!
}

// GET /team/members
team.get('/members', async (c) => {
  const userId = c.get('userId')

  const t = await getOrCreateTeam(userId, c.env.DB)
  if (!t) return c.json([])

  const { results } = await c.env.DB.prepare(
    `SELECT tm.id, tm.email, tm.role, tm.status, tm.joined_at, tm.last_active,
            COALESCE(u.name, tm.email) as name
     FROM team_members tm
     LEFT JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ?
     ORDER BY tm.joined_at ASC`,
  )
    .bind(t.id)
    .all<{ id: string; name: string; email: string; role: string; status: string; joined_at: string; last_active: string | null }>()

  return c.json(results)
})

// POST /team/members
team.post('/members', async (c) => {
  const userId = c.get('userId')
  const plan = c.get('userPlan')
  const body = await c.req.json<{ email?: string; role?: string }>()

  if (!body.email) throw badRequest('email is required')
  const email = body.email.toLowerCase().trim()
  const role = body.role === 'admin' ? 'admin' : 'member'

  // Only team plan can have members
  if (plan !== 'team') throw forbidden('Team members require a Team plan')

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>()
  if (!user) throw notFound('User not found')

  const t = await ensureTeam(userId, user.name, c.env.DB)

  // Check ownership or admin
  const caller = await c.env.DB.prepare(
    "SELECT role FROM team_members WHERE team_id = ? AND user_id = ? AND status = 'active'",
  )
    .bind(t.id, userId)
    .first<{ role: string }>()
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw forbidden('Only owners and admins can invite members')
  }

  // Check plan limit
  const limits = getPlanLimits(plan)
  const count = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM team_members WHERE team_id = ?')
    .bind(t.id)
    .first<{ cnt: number }>()
  if (count && count.cnt >= limits.members) {
    throw forbidden(`Team member limit reached (${limits.members} for ${plan} plan)`)
  }

  // Check duplicate
  const existing = await c.env.DB.prepare('SELECT id FROM team_members WHERE team_id = ? AND email = ?')
    .bind(t.id, email)
    .first()
  if (existing) throw badRequest('User already invited')

  const id = memberId()
  // Check if invited user exists
  const invitedUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()

  await c.env.DB.prepare(
    'INSERT INTO team_members (id, team_id, user_id, email, role, status, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, t.id, invitedUser?.id || null, email, role, invitedUser ? 'active' : 'pending', userId)
    .run()

  const member = await c.env.DB.prepare(
    `SELECT tm.id, tm.email, tm.role, tm.status, tm.joined_at, tm.last_active,
            COALESCE(u.name, tm.email) as name
     FROM team_members tm
     LEFT JOIN users u ON u.id = tm.user_id
     WHERE tm.id = ?`,
  )
    .bind(id)
    .first()

  return c.json(member, 201)
})

// PATCH /team/members/:id
team.patch('/members/:id', async (c) => {
  const userId = c.get('userId')
  const membId = c.req.param('id')
  const body = await c.req.json<{ role?: string }>()

  if (!body.role) throw badRequest('role is required')

  const t = await getOrCreateTeam(userId, c.env.DB)
  if (!t) throw notFound('Team not found')

  // Check caller is owner or admin
  const caller = await c.env.DB.prepare(
    "SELECT role FROM team_members WHERE team_id = ? AND user_id = ? AND status = 'active'",
  )
    .bind(t.id, userId)
    .first<{ role: string }>()
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw forbidden('Only owners and admins can change roles')
  }

  const target = await c.env.DB.prepare('SELECT * FROM team_members WHERE id = ? AND team_id = ?')
    .bind(membId, t.id)
    .first<TeamMemberRow>()
  if (!target) throw notFound('Member not found')
  if (target.role === 'owner') throw forbidden('Cannot change owner role')

  await c.env.DB.prepare('UPDATE team_members SET role = ? WHERE id = ?').bind(body.role, membId).run()

  const updated = await c.env.DB.prepare(
    `SELECT tm.id, tm.email, tm.role, tm.status, tm.joined_at, tm.last_active,
            COALESCE(u.name, tm.email) as name
     FROM team_members tm
     LEFT JOIN users u ON u.id = tm.user_id
     WHERE tm.id = ?`,
  )
    .bind(membId)
    .first()

  return c.json(updated)
})

// DELETE /team/members/:id
team.delete('/members/:id', async (c) => {
  const userId = c.get('userId')
  const membId = c.req.param('id')

  const t = await getOrCreateTeam(userId, c.env.DB)
  if (!t) throw notFound('Team not found')

  // Check caller is owner or admin
  const caller = await c.env.DB.prepare(
    "SELECT role FROM team_members WHERE team_id = ? AND user_id = ? AND status = 'active'",
  )
    .bind(t.id, userId)
    .first<{ role: string }>()
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    throw forbidden('Only owners and admins can remove members')
  }

  const target = await c.env.DB.prepare('SELECT * FROM team_members WHERE id = ? AND team_id = ?')
    .bind(membId, t.id)
    .first<TeamMemberRow>()
  if (!target) throw notFound('Member not found')
  if (target.role === 'owner') throw forbidden('Cannot remove the owner')

  await c.env.DB.prepare('DELETE FROM team_members WHERE id = ?').bind(membId).run()
  return c.json({ ok: true })
})

export default team
