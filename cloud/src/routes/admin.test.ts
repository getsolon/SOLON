import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import type { Env } from '../types'
import { AppError } from '../lib/errors'
import adminRoutes from './admin'

// Minimal D1 mock
type Row = Record<string, unknown>

function createMockDB(rows: Row[]) {
  const data = [...rows]

  function findRows(sql: string, binds: unknown[]): Row[] {
    const lower = sql.toLowerCase()
    if (lower.includes('select') && lower.includes('from users') && lower.includes('where id')) {
      return data.filter(r => r.id === binds[0])
    }
    if (lower.includes('select') && lower.includes('from users') && lower.includes('order by')) {
      return [...data]
    }
    return []
  }

  return {
    prepare(sql: string) {
      let binds: unknown[] = []
      return {
        bind(...args: unknown[]) {
          binds = args
          return this
        },
        async first<T>(): Promise<T | null> {
          const results = findRows(sql, binds)
          return (results[0] as T) ?? null
        },
        async all<T>(): Promise<{ results: T[] }> {
          const results = findRows(sql, binds) as T[]
          return { results }
        },
        async run() {
          const lower = sql.toLowerCase()
          if (lower.startsWith('update') && lower.includes('set role')) {
            const id = binds[1]
            const role = binds[0]
            const row = data.find(r => r.id === id)
            if (row) row.role = role
          }
          if (lower.startsWith('delete') && lower.includes('from users')) {
            const id = binds[0]
            const idx = data.findIndex(r => r.id === id)
            if (idx !== -1) data.splice(idx, 1)
          }
          return { success: true }
        },
      }
    },
    async batch(stmts: { run: () => Promise<unknown> }[]) {
      for (const s of stmts) await s.run()
      return []
    },
  }
}

function makeUser(overrides: Partial<Row> = {}): Row {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    password: '',
    plan: 'free',
    github_id: '12345',
    google_id: null,
    avatar_url: null,
    role: 'waitlisted',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

type Variables = { userId: string; userPlan: string; userRole: string }

function buildApp(db: ReturnType<typeof createMockDB>, adminUserId = 'admin-1') {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>()
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(err.toJSON(), err.status as 200)
    }
    return c.json({ error: 'Internal server error' }, 500)
  })
  // Simulate auth middleware setting the admin user
  app.use('*', async (c, next) => {
    c.set('userId', adminUserId)
    c.set('userPlan', 'free')
    c.set('userRole', 'admin')
    c.env = { DB: db as unknown as D1Database } as Env
    return next()
  })
  app.route('/', adminRoutes)
  return app
}

describe('GET /users', () => {
  it('returns all users', async () => {
    const db = createMockDB([
      makeUser({ id: 'admin-1', role: 'admin', name: 'Admin' }),
      makeUser({ id: 'user-1', role: 'waitlisted', name: 'Waitlisted' }),
    ])
    const app = buildApp(db)
    const res = await app.request('/users')
    expect(res.status).toBe(200)
    const body = await res.json() as Row[]
    expect(body).toHaveLength(2)
    expect(body[0]).toHaveProperty('id')
    expect(body[0]).toHaveProperty('role')
    // Should not expose password or internal fields
    expect(body[0]).not.toHaveProperty('password')
    expect(body[0]).not.toHaveProperty('github_id')
  })

  it('returns provider based on github_id / google_id', async () => {
    const db = createMockDB([
      makeUser({ id: 'u1', github_id: '123', google_id: null }),
      makeUser({ id: 'u2', github_id: null, google_id: '456' }),
      makeUser({ id: 'u3', github_id: null, google_id: null }),
    ])
    const app = buildApp(db)
    const res = await app.request('/users')
    const body = await res.json() as { provider: string | null }[]
    expect(body[0].provider).toBe('github')
    expect(body[1].provider).toBe('google')
    expect(body[2].provider).toBeNull()
  })
})

describe('PATCH /users/:id', () => {
  it('approves a waitlisted user', async () => {
    const db = createMockDB([
      makeUser({ id: 'admin-1', role: 'admin' }),
      makeUser({ id: 'user-1', role: 'waitlisted' }),
    ])
    const app = buildApp(db)
    const res = await app.request('/users/user-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { role: string }
    expect(body.role).toBe('user')
  })

  it('revokes an active user back to waitlisted', async () => {
    const db = createMockDB([
      makeUser({ id: 'admin-1', role: 'admin' }),
      makeUser({ id: 'user-1', role: 'user' }),
    ])
    const app = buildApp(db)
    const res = await app.request('/users/user-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'waitlisted' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { role: string }
    expect(body.role).toBe('waitlisted')
  })

  it('rejects invalid role', async () => {
    const db = createMockDB([makeUser({ id: 'user-1' })])
    const app = buildApp(db)
    const res = await app.request('/users/user-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'superadmin' }),
    })
    expect(res.status).toBe(400)
  })

  it('blocks changing own role', async () => {
    const db = createMockDB([makeUser({ id: 'admin-1', role: 'admin' })])
    const app = buildApp(db, 'admin-1')
    const res = await app.request('/users/admin-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' }),
    })
    expect(res.status).toBe(403)
  })

  it('blocks changing another admin role', async () => {
    const db = createMockDB([
      makeUser({ id: 'admin-1', role: 'admin' }),
      makeUser({ id: 'admin-2', role: 'admin' }),
    ])
    const app = buildApp(db, 'admin-1')
    const res = await app.request('/users/admin-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 404 for nonexistent user', async () => {
    const db = createMockDB([])
    const app = buildApp(db)
    const res = await app.request('/users/nope', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' }),
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /users/:id', () => {
  it('deletes a waitlisted user', async () => {
    const db = createMockDB([
      makeUser({ id: 'admin-1', role: 'admin' }),
      makeUser({ id: 'user-1', role: 'waitlisted' }),
    ])
    const app = buildApp(db)
    const res = await app.request('/users/user-1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('blocks self-deletion', async () => {
    const db = createMockDB([makeUser({ id: 'admin-1', role: 'admin' })])
    const app = buildApp(db, 'admin-1')
    const res = await app.request('/users/admin-1', { method: 'DELETE' })
    expect(res.status).toBe(403)
  })

  it('blocks deleting another admin', async () => {
    const db = createMockDB([
      makeUser({ id: 'admin-1', role: 'admin' }),
      makeUser({ id: 'admin-2', role: 'admin' }),
    ])
    const app = buildApp(db, 'admin-1')
    const res = await app.request('/users/admin-2', { method: 'DELETE' })
    expect(res.status).toBe(403)
  })

  it('returns 404 for nonexistent user', async () => {
    const db = createMockDB([])
    const app = buildApp(db)
    const res = await app.request('/users/nope', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})
