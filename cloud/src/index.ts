import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { AppError } from './lib/errors'
import { authMiddleware } from './middleware/auth'
import { requireRole } from './middleware/requireRole'
import { rateLimitMiddleware } from './middleware/rateLimit'
import authRoutes from './routes/auth'
import profileRoutes from './routes/profile'
import instanceRoutes from './routes/instances'
import tokenRoutes from './routes/tokens'
import teamRoutes from './routes/team'
import billingRoutes from './routes/billing'
import adminRoutes from './routes/admin'
import webhookRoutes from './routes/webhooks'

const app = new Hono<{ Bindings: Env }>()

// CORS
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://app.getsolon.dev', 'http://localhost:8420'],
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

// Public routes (no auth)
app.route('/api/auth', authRoutes)
app.route('/api/webhooks', webhookRoutes)

// Authed routes
const authed = new Hono<{ Bindings: Env; Variables: { userId: string; userPlan: string; userRole: string } }>()
authed.use('*', authMiddleware)
authed.use('*', rateLimitMiddleware)

// Profile is accessible to all authed users (including waitlisted — they need to see their status)
authed.route('/profile', profileRoutes)

// Protected routes require admin or user role (not waitlisted)
const protected_ = new Hono<{ Bindings: Env; Variables: { userId: string; userPlan: string; userRole: string } }>()
protected_.use('*', requireRole('admin', 'user'))
protected_.route('/instances', instanceRoutes)
protected_.route('/tokens', tokenRoutes)
protected_.route('/team', teamRoutes)
protected_.route('/billing', billingRoutes)

authed.route('/', protected_)

// Admin routes require admin role
const adminGroup = new Hono<{ Bindings: Env; Variables: { userId: string; userPlan: string; userRole: string } }>()
adminGroup.use('*', requireRole('admin'))
adminGroup.route('/', adminRoutes)

authed.route('/admin', adminGroup)

app.route('/api', authed)

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
