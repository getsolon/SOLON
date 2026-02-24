import { Hono } from 'hono'
import type { Env, UserRow } from '../types'
import { getPlanLimits } from '../lib/plans'
import { notFound } from '../lib/errors'

type Variables = { userId: string; userPlan: string }

const billing = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /billing
billing.get('/', async (c) => {
  const userId = c.get('userId')

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<UserRow>()
  if (!user) throw notFound('User not found')

  const limits = getPlanLimits(user.plan)

  const instanceCount = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM instances WHERE user_id = ?')
    .bind(userId)
    .first<{ cnt: number }>()

  const memberCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.owner_id = ?',
  )
    .bind(userId)
    .first<{ cnt: number }>()

  return c.json({
    plan: user.plan,
    status: 'active',
    current_period_end: null,
    usage: {
      instances: { used: instanceCount?.cnt || 0, limit: limits.instances },
      requests: { used: 0, limit: limits.requestsPerMin * 60 * 24 },
      team_members: { used: memberCount?.cnt || 0, limit: limits.members },
    },
    payment_method: null,
  })
})

// POST /billing/checkout
billing.post('/checkout', async (c) => {
  return c.json({ error: 'Billing coming soon' }, 501)
})

// POST /billing/portal
billing.post('/portal', async (c) => {
  return c.json({ error: 'Billing coming soon' }, 501)
})

export default billing
