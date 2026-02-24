import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { AppError } from './lib/errors'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rateLimit'
import authRoutes from './routes/auth'
import profileRoutes from './routes/profile'
import instanceRoutes from './routes/instances'
import tokenRoutes from './routes/tokens'
import teamRoutes from './routes/team'
import billingRoutes from './routes/billing'

const app = new Hono<{ Bindings: Env }>()

// CORS for local dev
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://app.getsolon.dev'],
  credentials: true,
}))

// Global error handler
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.status as 200)
  }
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Public routes
app.route('/api/auth', authRoutes)

// Authed routes
const authed = new Hono<{ Bindings: Env; Variables: { userId: string; userPlan: string } }>()
authed.use('*', authMiddleware)
authed.use('*', rateLimitMiddleware)
authed.route('/profile', profileRoutes)
authed.route('/instances', instanceRoutes)
authed.route('/tokens', tokenRoutes)
authed.route('/team', teamRoutes)
authed.route('/billing', billingRoutes)

app.route('/api', authed)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
