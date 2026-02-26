# Solon Product Roadmap

## Current State (v0.3.0-dev)

**Working end-to-end:**
- Go runtime: inference via Ollama proxy + llama.cpp (CGO), model pull/list/remove, streaming SSE
- Gateway: Bearer auth (bcrypt, prefix lookup), rate limiting (token bucket), CORS, request logging
- CLI: `serve`, `models pull/list/remove/info/add/known`, `keys create/list/revoke`, `tunnel enable/disable/status`, `status`, `version`
- Dashboard (local mode): Overview, Models, Keys, Requests, Settings — all wired to real API
- Cloudflare quick tunnel: starts `cloudflared`, parses trycloudflare.com URL
- Website: landing, pricing, docs, install script — deployed to Cloudflare Pages
- CI/CD: test + lint, cross-compile 4 targets, GitHub releases on tag, website + dashboard + cloud API deploy
- Model pull progress streaming (SSE) with real-time progress bar
- Health endpoint returns build-injected version
- PWA: manifest, service worker, "Add to Home Screen"
- Tunnel: `--tunnel` flag on `solon serve`, QR code + copy in Settings, status dot in sidebar
- Keyboard shortcuts: Ctrl/Cmd+K (model selector), Ctrl/Cmd+Shift+S (toggle sidebar)
- Cloud API (`api.getsolon.dev`): Hono Worker on Cloudflare with D1 + KV
  - Auth: register, login, JWT access + refresh token rotation (HttpOnly cookies)
  - Profile: CRUD + password change + account deletion
  - Instances: CRUD + health check proxy, AES-GCM encrypted API keys
  - API tokens: `sol_cloud_` prefixed, SHA-256 hashed
  - Teams: auto-create, invite by email, role management
  - Rate limiting: KV-based sliding window (60/300/1000 req/min by plan)
  - Billing: plan info + usage counts (Stripe not yet wired)
- Dashboard (cloud mode): real API calls replace all mocks, token refresh on 401, instances synced to cloud

**Scaffolded / not yet wired:**
- Relay tunnel: interface defined, all methods return "not yet implemented"
- MLX backend: `Available()` works on Apple Silicon, all ops return "not yet implemented"
- OpenClaw provider: thin adapter exists, never instantiated or wired
- `models` DB table: schema exists, never written to (filesystem registry used instead)
- Stripe billing: D1 subscriptions table ready, checkout/portal endpoints return 501
- Email verification: not implemented

**Gaps / bugs:**
- `solon serve` creates tunnel but never calls `Enable()` — requires separate CLI/API call

---

## Completed

### ~~Sprint 1: Dashboard Polish~~ (v0.2.0) ✓
> Remove rough edges, make the admin dashboard production-grade

- Model pull progress (SSE): real-time download progress bar with speed + ETA
- Health version fix: real version in health endpoint and dashboard footer
- PWA: manifest, icons, service worker, offline indicator
- Tunnel improvements: `--tunnel` flag, QR code, one-click copy, sidebar status dot
- Keyboard shortcuts: Ctrl/Cmd+K, Ctrl/Cmd+Shift+S

### ~~Sprint 2: Cloud Backend~~ (v0.3.0) ✓
> Real cloud platform — user accounts, persistent instance registry, team management

- Cloudflare Worker (`cloud/`) with Hono router, D1 database, KV rate limiting
- Auth: register, login, JWT (15min) + refresh tokens (30d, HttpOnly cookie rotation)
- PBKDF2-SHA256 password hashing (Web Crypto, Workers-compatible)
- Instance management: CRUD, plan-based limits, AES-GCM encrypted API keys, health check proxy
- API tokens: `sol_cloud_` prefix, SHA-256 hashed storage, dual auth (JWT + API token)
- Team management: auto-create team, invite by email, role-based access (owner/admin/member)
- Billing stub: plan info + usage counts from D1, checkout/portal return 501
- Dashboard rewrite: all mocks replaced with real `cloudFetch` calls
- Token refresh: 401 → try refresh → retry request → redirect to login
- Instances store: cloud mode fetches via API, localStorage as offline cache
- `_redirects` proxy: `/api/*` → `api.getsolon.dev`
- CI/CD: `cloud-api` job (typecheck, D1 migrations, wrangler deploy)
- Custom domain: `api.getsolon.dev` live
- Pricing aligned: Free $0, Pro $19/mo, Team $49/mo, Enterprise (Contact Sales)

---

## Roadmap

### Sprint 2b: Stripe Billing + Email Verification
> Wire up payments and verify user emails

**Stripe integration (`cloud/src/routes/billing.ts`):**
- Stripe Checkout session for plan upgrades (Free → Pro, Free → Team, Pro → Team)
- Stripe Customer Portal for managing payment method, cancellation, invoices
- Stripe Webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- On subscription change: update `users.plan` in D1, update `subscriptions` table
- Proration: Stripe handles mid-cycle upgrades/downgrades
- Free tier: no Stripe customer needed, just D1 defaults

**Pricing:**
| Tier | Price | Instances | Members | Rate Limit |
|------|-------|-----------|---------|------------|
| Free | $0 | 1 | 1 | 60/min |
| Pro | $19/mo | 10 | 1 | 300/min |
| Team | $49/mo | 50 | 25 | 1000/min |

**New files:**
```
cloud/src/routes/webhooks.ts    # Stripe webhook handler (signature verification)
cloud/src/lib/stripe.ts         # Stripe API helpers (create customer, checkout, portal)
```

**New secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**Email verification (`cloud/src/routes/auth.ts`):**
- On register: set `email_verified = false`, generate verification token, send email
- `POST /auth/verify-email` — verify token, set `email_verified = true`
- `POST /auth/resend-verification` — resend email (rate limited)
- Gate certain actions behind verified email (e.g., creating instances, inviting team members)
- Email delivery via Cloudflare Email Workers or Resend API

**Migration:** `0005_email_verification.sql`
```sql
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
CREATE TABLE email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'verify' | 'reset'
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Dashboard changes:**
- Billing page: wire "Select" buttons to Stripe Checkout
- Billing page: wire "Manage" button to Stripe Portal
- Settings page: show email verification status, resend button
- Login/register: show "verify your email" banner if unverified

---

### Sprint 3: Relay Tunnel
> Persistent, reliable tunnel URLs — no more random trycloudflare.com addresses

**Problem:** Cloudflare quick tunnels generate random URLs that change on restart. Users sharing their instance (with team, with apps) need stable URLs.

**Architecture:**
```
User's Solon instance
  ↕ WebSocket (persistent)
relay.getsolon.dev (Cloudflare Durable Object)
  ↕ HTTPS
Remote client (dashboard, API consumer)
```

**Cloudflare Durable Objects:** Each Solon instance gets a Durable Object that:
- Accepts WebSocket from Solon binary (outbound from user's network, no port forwarding)
- Accepts HTTPS from remote clients
- Proxies requests: remote client → DO → WebSocket → Solon → response back
- Persists connection state, handles reconnection

**Solon binary changes:**
- `internal/tunnel/relay.go`: implement `Enable()` → WebSocket connect to `relay.getsolon.dev`
- Register instance with cloud backend (requires auth token from Sprint 2)
- Persistent URL format: `https://{instance-slug}.relay.getsolon.dev`
- Auto-reconnect with exponential backoff
- Heartbeat to keep connection alive

**Relay Worker:** `cloud/relay/` (separate Cloudflare Worker with Durable Objects)
```
cloud/relay/
  wrangler.toml
  src/
    index.ts              # HTTP router: proxy requests to correct DO
    tunnel.ts             # Durable Object: WebSocket ↔ HTTP bridge
```

**Tunnel priority:** Solon tries in order:
1. Relay tunnel (if cloud account, persistent URL)
2. Cloudflare quick tunnel (if `cloudflared` installed, random URL)
3. Direct (local network only)

**Dashboard integration:**
- Settings page: show relay URL, connection status, latency
- Cloud instances page: connect via relay URL instead of manual tunnel URL

---

### Sprint 4: MLX Backend + Multi-Backend Intelligence
> Native Apple Silicon inference, smart backend selection

**MLX backend (`internal/inference/backends/mlx.go`):**
- Implement via `mlx-lm` Python bridge or native Go bindings
- Support safetensors model format (HuggingFace native, no GGUF conversion needed)
- Metal acceleration (already native on Apple Silicon)
- Streaming support

**Smart backend selection (`internal/inference/engine.go`):**
- Auto-detect available backends on startup
- Ranking: MLX (Apple Silicon) > llama.cpp (GPU available) > Ollama (fallback)
- Per-model backend override in config
- Dashboard Models page: show which backend each model uses, allow switching

**Performance dashboard:**
- Model benchmarks page: run standard prompts, compare backends
- Memory usage display

---

### Sprint 5: OpenClaw Integration + Agent Features
> Multi-model orchestration, tool use, agent workflows

**Wire OpenClaw provider:**
- `internal/openclaw/provider.go`: register with OpenClaw agent framework
- Solon appears as a tool provider in OpenClaw agent configs
- Multi-model routing: different models for different tasks (e.g., small model for classification, large for generation)

---

### Separate Product: Solon Chat (`chat.getsolon.app`)
> Standalone chat experience — consumer-facing, not an admin tool

Chat was prototyped in the local dashboard (Sprint 1 original) and removed. It's a consumer experience that doesn't belong in an ops dashboard. It will be built as a standalone app.

**Scope:**
- Standalone React app deployed to `chat.getsolon.app`
- Connects to any Solon instance (local or remote via tunnel/relay)
- Streaming chat with markdown rendering, code blocks, syntax highlighting
- Conversation history (local storage, later cloud-synced)
- Model selector, system prompt editor, parameter tuning
- Tool/function calling display for agent workflows
- Multi-turn conversation export (JSON, markdown)
- Mobile-first PWA

**Depends on:** Sprint 2 (cloud auth for remote instances), Sprint 3 Relay (for stable URLs)

---

## Sprint Timeline

```
Sprint 1: Dashboard Polish ........... ✓ Done (v0.2.0)
Sprint 2: Cloud Backend .............. ✓ Done (v0.3.0)
Sprint 2b: Stripe + Email ........... Next
Sprint 3: Relay Tunnel ............... After 2b
Sprint 4: MLX + Multi-Backend ........ After 3
Sprint 5: OpenClaw + Agents .......... After 4
Chat App ............................. After Sprint 3
```

## Version Mapping

| Version | Sprints | Milestone |
|---------|---------|-----------|
| v0.1.0 | — | Foundation |
| v0.2.0 | 1 | Dashboard Polish ✓ |
| v0.3.0 | 2 | Cloud Platform ✓ |
| v0.3.1 | 2b | Stripe Billing + Email Verification |
| v0.4.0 | 3 | Relay Tunnel |
| v0.5.0 | 4 + 5 | MLX + Agents |
| v0.6.0 | Chat App | Solon Chat at `chat.getsolon.app` |
