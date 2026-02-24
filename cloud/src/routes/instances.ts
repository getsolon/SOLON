import { Hono } from 'hono'
import type { Env, InstanceRow } from '../types'
import { encrypt, decrypt } from '../lib/crypto'
import { instanceId } from '../lib/id'
import { getPlanLimits } from '../lib/plans'
import { badRequest, notFound, forbidden } from '../lib/errors'

type Variables = { userId: string; userPlan: string }

const instances = new Hono<{ Bindings: Env; Variables: Variables }>()

function instanceResponse(row: InstanceRow) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    status: row.status,
    version: row.version,
    models_count: row.models_count,
    added_at: row.added_at,
  }
}

// GET /instances
instances.get('/', async (c) => {
  const userId = c.get('userId')

  // Get user's own instances + team instances
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM instances WHERE user_id = ?
     UNION
     SELECT i.* FROM instances i
     JOIN team_members tm ON tm.team_id = i.team_id
     WHERE tm.user_id = ? AND tm.status = 'active'
     ORDER BY added_at DESC`,
  )
    .bind(userId, userId)
    .all<InstanceRow>()

  return c.json(results.map(instanceResponse))
})

// POST /instances
instances.post('/', async (c) => {
  const userId = c.get('userId')
  const plan = c.get('userPlan')
  const body = await c.req.json<{ name?: string; url?: string; api_key?: string }>()

  if (!body.name || !body.url || !body.api_key) throw badRequest('name, url, and api_key are required')

  // Check plan limit
  const limits = getPlanLimits(plan)
  const count = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM instances WHERE user_id = ?')
    .bind(userId)
    .first<{ cnt: number }>()
  if (count && count.cnt >= limits.instances) {
    throw forbidden(`Instance limit reached (${limits.instances} for ${plan} plan)`)
  }

  const id = instanceId()
  const apiKeyEnc = await encrypt(body.api_key, c.env.ENCRYPTION_KEY)
  const url = body.url.replace(/\/$/, '')

  await c.env.DB.prepare('INSERT INTO instances (id, user_id, name, url, api_key_enc) VALUES (?, ?, ?, ?, ?)')
    .bind(id, userId, body.name.trim(), url, apiKeyEnc)
    .run()

  const row = (await c.env.DB.prepare('SELECT * FROM instances WHERE id = ?').bind(id).first<InstanceRow>())!
  return c.json(instanceResponse(row), 201)
})

// GET /instances/:id
instances.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const row = await c.env.DB.prepare('SELECT * FROM instances WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<InstanceRow>()
  if (!row) throw notFound('Instance not found')

  return c.json(instanceResponse(row))
})

// PATCH /instances/:id
instances.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json<{ name?: string; url?: string; api_key?: string }>()

  const existing = await c.env.DB.prepare('SELECT * FROM instances WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<InstanceRow>()
  if (!existing) throw notFound('Instance not found')

  const updates: string[] = []
  const values: (string | number)[] = []

  if (body.name !== undefined) {
    updates.push('name = ?')
    values.push(body.name.trim())
  }
  if (body.url !== undefined) {
    updates.push('url = ?')
    values.push(body.url.replace(/\/$/, ''))
  }
  if (body.api_key !== undefined) {
    updates.push('api_key_enc = ?')
    values.push(await encrypt(body.api_key, c.env.ENCRYPTION_KEY))
  }

  if (updates.length === 0) throw badRequest('No fields to update')

  values.push(id)
  await c.env.DB.prepare(`UPDATE instances SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()

  const row = (await c.env.DB.prepare('SELECT * FROM instances WHERE id = ?').bind(id).first<InstanceRow>())!
  return c.json(instanceResponse(row))
})

// DELETE /instances/:id
instances.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT id FROM instances WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first()
  if (!existing) throw notFound('Instance not found')

  await c.env.DB.prepare('DELETE FROM instances WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// POST /instances/:id/health
instances.post('/:id/health', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const row = await c.env.DB.prepare('SELECT * FROM instances WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<InstanceRow>()
  if (!row) throw notFound('Instance not found')

  const apiKey = await decrypt(row.api_key_enc, c.env.ENCRYPTION_KEY)

  let status = 'offline'
  let version: string | null = null
  let modelsCount = 0

  try {
    const healthRes = await fetch(`${row.url}/api/v1/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    })
    if (healthRes.ok) {
      const health = (await healthRes.json()) as { status: string; version?: string }
      status = 'online'
      version = health.version || null
    }

    const modelsRes = await fetch(`${row.url}/api/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    })
    if (modelsRes.ok) {
      const models = (await modelsRes.json()) as { data?: unknown[] }
      modelsCount = models.data?.length || 0
    }
  } catch {
    // Instance unreachable
  }

  await c.env.DB.prepare('UPDATE instances SET status = ?, version = ?, models_count = ? WHERE id = ?')
    .bind(status, version, modelsCount, id)
    .run()

  return c.json({ status, version, models_count: modelsCount })
})

export default instances
