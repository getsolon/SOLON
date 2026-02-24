# Solon Product Roadmap

## Current State (v0.2.0-dev)

**Working end-to-end:**
- Go runtime: inference via Ollama proxy + llama.cpp (CGO), model pull/list/remove, streaming SSE
- Gateway: Bearer auth (bcrypt, prefix lookup), rate limiting (token bucket), CORS, request logging
- CLI: `serve`, `models pull/list/remove/info/add/known`, `keys create/list/revoke`, `tunnel enable/disable/status`, `status`, `version`
- Dashboard (local mode): Overview, Models, Keys, Requests, Settings — all wired to real API
- Cloudflare quick tunnel: starts `cloudflared`, parses trycloudflare.com URL
- Website: landing, pricing, docs, install script — deployed to Cloudflare Pages
- CI/CD: test + lint, cross-compile 4 targets, GitHub releases on tag, website + dashboard deploy
- Model pull progress streaming (SSE) with real-time progress bar
- Health endpoint returns build-injected version
- PWA: manifest, service worker, "Add to Home Screen"
- Tunnel: `--tunnel` flag on `solon serve`, QR code + copy in Settings, status dot in sidebar
- Keyboard shortcuts: Ctrl/Cmd+K (model selector), Ctrl/Cmd+Shift+S (toggle sidebar)

**Scaffolded / mock:**
- Dashboard cloud mode: login, register, billing, team, instances — all mock data in `api/cloud.ts`
- Relay tunnel: interface defined, all methods return "not yet implemented"
- MLX backend: `Available()` works on Apple Silicon, all ops return "not yet implemented"
- OpenClaw provider: thin adapter exists, never instantiated or wired
- `models` DB table: schema exists, never written to (filesystem registry used instead)

**Gaps / bugs:**
- `solon serve` creates tunnel but never calls `Enable()` — requires separate CLI/API call
- Website pricing ($9/$19/$49) doesn't match dashboard billing mock ($19/$49/custom)

---

## Completed

### ~~Sprint 1: Dashboard Polish~~ (v0.2.0) ✓
> Remove rough edges, make the admin dashboard production-grade

- Model pull progress (SSE): real-time download progress bar with speed + ETA
- Health version fix: real version in health endpoint and dashboard footer
- PWA: manifest, icons, service worker, offline indicator
- Tunnel improvements: `--tunnel` flag, QR code, one-click copy, sidebar status dot
- Keyboard shortcuts: Ctrl/Cmd+K, Ctrl/Cmd+Shift+S

---

## Roadmap

### Sprint 2: Cloud Backend (Cloudflare Workers + D1)
> Real cloud platform — user accounts, persistent instance registry, billing

**Architecture:**
```
app.getsolon.dev (Cloudflare Pages)
  → dashboard SPA (same build as local)
  → mode: cloud (no /api/v1/health response)
  → API calls → api.getsolon.dev (Cloudflare Worker)

api.getsolon.dev (Cloudflare Worker)
  → D1 database (SQLite on the edge)
  → KV store (sessions, rate limits)
  → Stripe webhook handler
```

**New repo or directory:** `cloud/` (Cloudflare Worker project)
```
cloud/
  wrangler.toml           # D1 binding, KV namespace, routes
  src/
    index.ts              # Hono router
    auth.ts               # Register, login, JWT, refresh tokens
    instances.ts          # Instance CRUD, connection testing
    billing.ts            # Stripe checkout, webhooks, subscription state
    team.ts               # Team invites, members, roles
    middleware.ts         # Auth middleware, CORS
  migrations/
    001_users.sql         # users, sessions, teams, team_members
    002_instances.sql     # instances, instance_keys
    003_billing.sql       # subscriptions, usage_records
```

**Replace mock API:**
- `dashboard/src/api/cloud.ts`: replace all mock functions with real `fetch` calls to `api.getsolon.dev`
- Auth: real JWT flow (access + refresh tokens), D1-backed user table
- Instances: stored in D1 (not localStorage), connection health checks via Worker proxy
- Billing: Stripe Checkout for subscription, webhook for status updates
- Team: D1-backed team membership, invite by email

**Pricing (align website + dashboard):**
| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 1 remote instance, 1 team member |
| Pro | $19/mo | 10 instances, 5 team members, priority support |
| Team | $49/mo | Unlimited instances, unlimited members, SSO, audit logs |

**CI/CD:**
- Add `cloud-deploy` job to CI: `wrangler deploy` on push to main
- D1 migrations applied via `wrangler d1 migrations apply`

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

**Depends on:** Sprint 3 (cloud auth for remote instances), Sprint 3 Relay (for stable URLs)

---

## Sprint Timeline

```
Sprint 1: Dashboard Polish ........... ✓ Done
Sprint 2: Cloud Backend .............. Week 1-2
Sprint 3: Relay Tunnel ............... Week 3
Sprint 4: MLX + Multi-Backend ........ Week 4
Sprint 5: OpenClaw + Agents .......... Week 5
Chat App ............................. After Sprint 3
```

## Version Mapping

| Version | Sprints | Milestone |
|---------|---------|-----------|
| v0.1.0 | — | Foundation |
| v0.2.0 | 1 | Dashboard Polish ✓ |
| v0.3.0 | 2 + 3 | Cloud Platform + Relay |
| v0.4.0 | 4 + 5 | MLX + Agents |
| v0.5.0 | Chat App | Solon Chat at `chat.getsolon.app` |
