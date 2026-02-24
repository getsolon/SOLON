import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'
import { getPlanLimits } from '../lib/plans'
import { tooManyRequests } from '../lib/errors'

type Variables = {
  userId: string
  userPlan: string
}

export const rateLimitMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
  const userId = c.get('userId')
  const plan = c.get('userPlan')
  const limits = getPlanLimits(plan)

  const windowKey = `rl:${userId}:${Math.floor(Date.now() / 60_000)}`
  const current = parseInt((await c.env.KV.get(windowKey)) || '0', 10)

  if (current >= limits.requestsPerMin) {
    throw tooManyRequests(`Rate limit exceeded (${limits.requestsPerMin}/min for ${plan} plan)`)
  }

  await c.env.KV.put(windowKey, String(current + 1), { expirationTtl: 120 })
  return next()
})
