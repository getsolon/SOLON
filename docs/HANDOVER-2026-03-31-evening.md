# Session Handover — 2026-03-31 Evening

## What Was Done

### Architecture Fix
- **Restored the unified dashboard** (`dashboard/`) as the main product at app.getsolon.dev. It was accidentally overwritten by the hosting/ Next.js app.
- The dashboard works in both local mode (embedded in Go binary) and cloud mode (Cloudflare Pages).
- Cloud pages restored from git history: Login, AuthCallback, Onboarding, Instances, Billing, Team, AccountSettings, Users.
- CI fixed: `cloud-app` job now deploys `dashboard/dist` to `solon-cloud` Pages project (was deploying `hosting/out`).

### Open Signups + v0.2.0 Release
- Removed beta allowlist from cloud API — anyone can sign up via GitHub/Google OAuth.
- Tagged and released **v0.2.0** with all features: providers, sandboxes, OpenClaw agents, tiered security, proxy backend. `curl -fsSL https://getsolon.dev | sh` installs it.

### Dashboard UX Overhaul (PR #8, merged)
- **Home page**: Claude Console style — greeting + 3 action buttons (Create Agent / Run Model Locally / Run Model in Cloud) + stats grid for returning users.
- **Sidebar**: Collapsible, sectioned (BUILD / AGENTS / MANAGE). Chat, Providers, Sandboxes now visible in nav. Collapse state persisted.
- Removed separate `/onboarding` route — home page IS the onboarding.

### Sidebar Theme + Login Logo (PR #9, merged)
- Sidebar now theme-aware using CSS variables — light bg in light mode, dark bg in dark mode (like Claude Console).
- Login page and loading spinner use circle logo with glow per brand brief (was purple square with "S").

### Brand Brief
- Created `docs/BRAND.md` — logo (circle), colors (brand #1a1a2e, accent #6c63ff), typography (system fonts), component patterns, voice guidelines.

### Development Workflow
- Established: feature branches + PRs, never push directly to master. Master auto-deploys everything.

---

## What's In Progress

### R2 Model Mirror
- **Bucket created**: `solon-models` on Cloudflare R2 (EU jurisdiction, Standard class).
- **Not yet done**:
  1. Enable public access on the bucket (Settings tab → Public Access, or add custom domain `models.getsolon.dev`)
  2. Create R2 API token for uploads (R2 > Overview > Manage R2 API Tokens → read/write on `solon-models`)
  3. Build upload script to download 10 models from HuggingFace and push to R2
  4. Update Solon's download code (`internal/models/download.go`) to check R2 first
  5. Update catalog (`internal/models/catalog.json`) with R2 URLs

### 10 Models to Mirror
| # | Model | Params | GGUF Size |
|---|-------|--------|-----------|
| 1 | Llama 3.2 3B | 3B | ~2 GB |
| 2 | Gemma 3 4B | 4B | ~2.5 GB |
| 3 | Phi-4 Mini | 3.8B | ~2.3 GB |
| 4 | Llama 3.1 8B | 8B | ~4.5 GB |
| 5 | Mistral 7B | 7B | ~4 GB |
| 6 | Qwen 2.5 7B | 7B | ~4.5 GB |
| 7 | Gemma 3 12B | 12B | ~7 GB |
| 8 | DeepSeek R1 14B | 14B | ~8 GB |
| 9 | Llama 3.1 70B | 70B | ~40 GB |
| 10 | Mixtral 8x7B | 47B | ~26 GB |

Total: ~101 GB ≈ $1.52/month on R2. Egress: free.

---

## What's Deployed

| Domain | Source | Status |
|--------|--------|--------|
| getsolon.dev | website/ (Astro) | Deployed |
| app.getsolon.dev | dashboard/dist (Vite+React) → solon-cloud Pages | Deployed |
| api.getsolon.dev | cloud/ (Hono Worker) | Deployed, open signups |
| relay.getsolon.dev | relay/ (Worker) | Deployed |
| demo.getsolon.dev | Go binary on Hetzner 178.104.104.13 | Running (basic auth) |
| install worker | install/ (Worker) | Deployed, serves v0.2.0 |

---

## What's NOT Working

| Feature | Status | Blocker |
|---------|--------|---------|
| Managed hosting (Stripe → provision) | Broken | No Stripe keys configured, no provisioner service |
| Cloud BYOK proxy | Not built | Cloud API doesn't proxy inference |
| HuggingFace gated models | Blocked | Need R2 mirror (in progress) |
| Homebrew formula | Not updated | update-homebrew CI job needs HOMEBREW_TAP_TOKEN |
| Image generation (Flux) | Roadmap | Different inference backend needed |

---

## Key Commits (this session)

```
28fb5b4 fix: brand compliance — circle logo, no emojis, correct routes
cef6f24 feat: redesign onboarding — three streams matching product reality
9f92b88 feat: open signups and redesign onboarding with three paths
7ca802c docs: add brand brief for consistent design decisions
6597aa9 feat: restore cloud mode in dashboard, fix CI deploy
2bcb686 fix: deploy hosting app to solon-cloud Pages project
4c28677 feat: convert hosting app to static SPA calling cloud API
```

PR #8: Dashboard UX overhaul (merged)
PR #9: Sidebar theme + login logo (merged)

---

## Next Steps (Priority Order)

### P0: R2 Model Mirror
1. Enable public access on `solon-models` bucket
2. Create R2 API token
3. Build upload script + update download code
4. Test: `solon models pull gemma3:4b` downloads from R2

### P1: End-to-End Testing
5. Test full self-host flow: signup → install → `solon serve` → pull model → chat
6. Test agent flow: add Anthropic key → `solon openclaw` → chat with agent
7. Fix any issues found

### P2: Managed Hosting
8. Configure Stripe production keys
9. Deploy provisioner service
10. Test checkout → provision → running server

### P3: Product Polish
11. Image generation (Flux) — roadmap
12. Channel integrations (Slack, WhatsApp) — roadmap
13. Agent templates — roadmap

---

## Key Files Changed

```
# Dashboard UX
dashboard/src/App.tsx                    — Unified routing, no onboarding route
dashboard/src/pages/Home.tsx             — Greeting + 3 action buttons + stats
dashboard/src/components/Sidebar.tsx     — Theme-aware, collapsible, sectioned
dashboard/src/layouts/AppLayout.tsx      — Responds to collapsed sidebar
dashboard/src/layouts/AuthLayout.tsx     — Circle logo
dashboard/src/store/ui.ts               — sidebarCollapsed state

# Cloud pages (restored from git)
dashboard/src/pages/cloud/              — All cloud pages restored
dashboard/src/api/cloud.ts              — Cloud API client
dashboard/src/hooks/useAuth.ts          — Auth hook
dashboard/src/lib/mode.ts               — Mode detection
dashboard/src/store/auth.ts             — Auth store
dashboard/src/store/mode.ts             — Mode store
dashboard/src/store/instances.ts        — Instances store

# Cloud API
cloud/src/routes/auth.ts                — Removed beta allowlist

# CI
.github/workflows/ci.yml               — cloud-app deploys dashboard/dist

# Brand
docs/BRAND.md                           — Brand brief
```
