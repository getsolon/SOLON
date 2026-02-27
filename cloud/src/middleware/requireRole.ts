import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'
import { forbidden } from '../lib/errors'

type Variables = {
  userId: string
  userPlan: string
  userRole: string
}

export function requireRole(...allowed: string[]) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const role = c.get('userRole')
    if (!allowed.includes(role)) {
      throw forbidden('Your account is on the waitlist. Access is restricted.')
    }
    return next()
  })
}
