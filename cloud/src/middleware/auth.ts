import { createMiddleware } from 'hono/factory'
import type { Env, JWTPayload } from '../types'
import { verifyJWT } from '../lib/jwt'
import { sha256 } from '../lib/password'
import { unauthorized } from '../lib/errors'

type Variables = {
  userId: string
  userPlan: string
}

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) throw unauthorized()

  const token = header.slice(7)

  // API token auth (sol_cloud_ prefix)
  if (token.startsWith('sol_cloud_')) {
    const hash = await sha256(token)
    const row = await c.env.DB.prepare(
      'SELECT t.user_id, u.plan FROM api_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ?',
    )
      .bind(hash)
      .first<{ user_id: string; plan: string }>()

    if (!row) throw unauthorized('Invalid API token')

    // Update last_used
    await c.env.DB.prepare("UPDATE api_tokens SET last_used = datetime('now') WHERE token_hash = ?").bind(hash).run()

    c.set('userId', row.user_id)
    c.set('userPlan', row.plan)
    return next()
  }

  // JWT auth
  let payload: JWTPayload
  try {
    payload = await verifyJWT(token, c.env.JWT_SECRET)
  } catch {
    throw unauthorized('Invalid or expired token')
  }

  c.set('userId', payload.sub)
  c.set('userPlan', payload.plan)
  return next()
})
