import { Hono } from 'hono'
import type { Env, ApiTokenRow } from '../types'
import { sha256 } from '../lib/password'
import { tokenId } from '../lib/id'
import { badRequest, notFound } from '../lib/errors'

type Variables = { userId: string; userPlan: string }

const tokens = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /tokens
tokens.get('/', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, prefix, created_at, last_used FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC',
  )
    .bind(userId)
    .all<Pick<ApiTokenRow, 'id' | 'name' | 'prefix' | 'created_at' | 'last_used'>>()

  return c.json(results)
})

// POST /tokens
tokens.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ name?: string }>()
  if (!body.name) throw badRequest('name is required')

  // Generate token
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  const randomPart = Array.from(randomBytes)
    .map(b => b.toString(36).padStart(2, '0').slice(-1))
    .join('')
  const token = `sol_cloud_${randomPart}`
  const hash = await sha256(token)
  const prefix = `sol_cloud_...${randomPart.slice(-4)}`

  const id = tokenId()
  await c.env.DB.prepare('INSERT INTO api_tokens (id, user_id, name, prefix, token_hash) VALUES (?, ?, ?, ?, ?)')
    .bind(id, userId, body.name.trim(), prefix, hash)
    .run()

  return c.json({ id, token }, 201)
})

// DELETE /tokens/:id
tokens.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const existing = await c.env.DB.prepare('SELECT id FROM api_tokens WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first()
  if (!existing) throw notFound('Token not found')

  await c.env.DB.prepare('DELETE FROM api_tokens WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export default tokens
