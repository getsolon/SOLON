# Solon Product Roadmap

## Current State (v0.1.0-dev)

**Working end-to-end:**
- Go runtime: inference via Ollama proxy + llama.cpp (CGO), model pull/list/remove, streaming SSE
- Gateway: Bearer auth (bcrypt, prefix lookup), rate limiting (token bucket), CORS, request logging
- CLI: `serve`, `models pull/list/remove/info/add/known`, `keys create/list/revoke`, `tunnel enable/disable/status`, `status`, `version`
- Dashboard (local mode): Overview, Models, Keys, Requests, Settings — all wired to real API
- Cloudflare quick tunnel: starts `cloudflared`, parses trycloudflare.com URL
- Website: landing, pricing, docs, install script — deployed to Cloudflare Pages
- CI/CD: test + lint, cross-compile 4 targets, GitHub releases on tag, website + dashboard deploy

**Scaffolded / mock:**
- Dashboard cloud mode: login, register, billing, team, instances — all mock data in `api/cloud.ts`
- Relay tunnel: interface defined, all methods return "not yet implemented (v0.2)"
- MLX backend: `Available()` works on Apple Silicon, all ops return "not yet implemented (v0.2)"
- OpenClaw provider: thin adapter exists, never instantiated or wired
- `models` DB table: schema exists, never written to (filesystem registry used instead)

**Gaps / bugs:**
- Inference routes use `g.Authenticate` (requires API key) — dashboard can't call `/v1/chat/completions` without a key
- Model pull over HTTP blocks with no progress — long downloads timeout
- Health endpoint hardcodes `"version": "dev"` instead of using build-injected version
- `solon serve` creates tunnel but never calls `Enable()` — requires separate CLI/API call
- Website pricing ($9/$19/$49) doesn't match dashboard billing mock ($19/$49/custom)

---

## Roadmap

### Sprint 1: Chat Experience
> Make Solon immediately useful the moment you open it

**Goal:** User installs Solon, pulls a model, opens localhost:8420, and starts chatting. No API keys, no setup, just works. Chat is the default landing page.

**Backend:**
- `internal/gateway/gateway.go` line 64: change `g.Authenticate` → `g.LocalhostOrAuth` on inference routes (safe: remote consumers still need keys, localhost is already trusted for management API)

**Dashboard — new files:**
| File | Purpose |
|------|---------|
| `src/api/streaming.ts` | SSE parser for `/v1/chat/completions` with `stream: true`, rAF token batching |
| `src/store/chat.ts` | Zustand: conversations, messages, activeId, streaming state, localStorage persistence |
| `src/hooks/useAutoScroll.ts` | Auto-scroll during streaming, pause on user scroll-up, "scroll to bottom" FAB |
| `src/hooks/useChatStream.ts` | Orchestrates: POST → stream tokens → store → abort support |
| `src/components/chat/ChatInput.tsx` | Auto-resize textarea, Enter/Shift+Enter, send/stop button, model selector |
| `src/components/chat/MessageBubble.tsx` | User (right, brand bg) + assistant (left, card bg) messages |
| `src/components/chat/MarkdownRenderer.tsx` | `marked` → HTML: paragraphs, lists, bold, code, tables |
| `src/components/chat/CodeBlock.tsx` | Fenced code: language label, copy button, `highlight.js` syntax coloring |
| `src/components/chat/MessageList.tsx` | Scrollable container with auto-scroll hook |
| `src/components/chat/ModelSelector.tsx` | Dropdown from loaded models list |
| `src/components/chat/ConversationList.tsx` | Sidebar panel: conversations with rename/delete |
| `src/components/chat/ChatEmptyState.tsx` | Welcome: model name, 4 suggested prompts |
| `src/components/chat/TypingIndicator.tsx` | Animated dots while waiting for first token |
| `src/pages/instance/Chat.tsx` | Main page composing all chat components |

**Dashboard — modified files:**
| File | Change |
|------|--------|
| `src/api/types.ts` | Add `ChatMessage`, `Conversation`, `ChatCompletionChunk` types |
| `src/App.tsx` | Add `/instance/local/chat` + `/instances/:id/chat` routes, default redirect → chat |
| `src/components/Sidebar.tsx` | Add Chat as first nav item (message-square icon) |
| `src/index.css` | Prose styles for markdown, code block theming |
| `package.json` | Add `marked`, `highlight.js` |

**UX spec:**
- Messages: user right-aligned (brand bg), assistant left-aligned (card bg), full-width markdown
- Input: auto-resize (1→6 lines), Enter sends, Shift+Enter newline, stop button during stream
- Streaming: typing indicator → tokens appear smoothly (rAF batching, 60fps), cursor animation at end
- Code blocks: dark bg in both themes, language label, copy on hover, highlight.js after stream completes
- Conversations: listed in collapsible panel, auto-title from first message, rename/delete on hover
- Responsive: mobile full-screen chat, conversation list via hamburger

---

### Sprint 2: Polish & Developer Experience
> Remove rough edges, make it feel production-grade

**Model pull progress (SSE):**
- `internal/gateway/gateway.go`: change `handlePullModel` to stream progress via SSE (`text/event-stream`)
- Dashboard Models page: show real-time download progress bar with speed + ETA
- Progress callback already exists in CLI (`models.Pull` accepts callback) — wire it to HTTP

**Health version fix:**
- `internal/gateway/gateway.go`: pass build version from `main.go` into Gateway config
- Health endpoint returns real version, dashboard footer shows it

**PWA:**
- Already have `vite-plugin-pwa` in devDeps — configure manifest, icons, service worker
- "Add to Home Screen" on mobile → full-screen chat app
- Offline indicator when server unreachable

**Tunnel improvements:**
- Add `--tunnel` flag to `solon serve` → auto-enable Cloudflare tunnel on startup
- Dashboard Settings page: show tunnel URL, one-click copy, QR code for mobile access
- Show tunnel status in sidebar footer (green dot when active)

**Keyboard shortcuts:**
- `Ctrl/Cmd+N`: new conversation
- `Ctrl/Cmd+K`: model selector
- `Ctrl/Cmd+Shift+S`: toggle sidebar
- `/` to focus chat input

---

### Sprint 3: Cloud Backend (Cloudflare Workers + D1)
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

### Sprint 4: Relay Tunnel
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
- Register instance with cloud backend (requires auth token from Sprint 3)
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

### Sprint 5: MLX Backend + Multi-Backend Intelligence
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
- Tokens/sec metric in chat UI (shown subtly after response completes)
- Model benchmarks page: run standard prompts, compare backends
- Memory usage display

---

### Sprint 6: OpenClaw Integration + Agent Features
> Multi-model orchestration, tool use, agent workflows

**Wire OpenClaw provider:**
- `internal/openclaw/provider.go`: register with OpenClaw agent framework
- Solon appears as a tool provider in OpenClaw agent configs
- Multi-model routing: different models for different tasks (e.g., small model for classification, large for generation)

**Agent features in chat UI:**
- Tool/function calling display: show tool invocations as collapsible cards
- System prompt editor: set per-conversation system messages
- Temperature/top-p/max-tokens sliders in advanced settings
- Multi-turn conversation export (JSON, markdown)

---

## Sprint Timeline

```
Sprint 1: Chat Experience ............. Week 1
Sprint 2: Polish & DX ................ Week 2
Sprint 3: Cloud Backend .............. Week 3-4
Sprint 4: Relay Tunnel ............... Week 5
Sprint 5: MLX + Multi-Backend ........ Week 6
Sprint 6: OpenClaw + Agents .......... Week 7
```

## Version Mapping

| Version | Sprints | Milestone |
|---------|---------|-----------|
| v0.1.0 | — | Foundation (current, tag when stable) |
| v0.2.0 | 1 + 2 | Chat + Polish |
| v0.3.0 | 3 + 4 | Cloud Platform + Relay |
| v0.4.0 | 5 + 6 | MLX + Agents |
