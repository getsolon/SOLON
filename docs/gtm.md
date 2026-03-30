# Solon — Go-To-Market Plan

**Domain:** getsolon.dev
**Tagline:** Your AI. Your rules.
**Date:** 2026-03-30

---

## 1. Product Summary

Solon is a self-hosted AI runtime — a single Go binary that runs AI models locally, exposes an OpenAI-compatible API with mandatory authentication, and provides secure internet access via tunnel. Optional managed hosting gives customers a turnkey AI server on dedicated hardware.

**One-liner:** The secure, self-hosted AI runtime for developers and teams who don't want their inference traffic touching someone else's servers.

---

## 2. Target Segments

### Segment A — Solo Developers & Hobbyists
- Run local models on Mac/Linux for personal projects
- Privacy-motivated, cost-sensitive
- Currently using Ollama, LM Studio, or raw llama.cpp
- **Entry point:** `curl -fsSL https://getsolon.dev | sh`
- **Revenue:** Free tier (Solon Cloud) → Pro upgrade for relay/team features

### Segment B — Hybrid AI Pipeline Teams
- Production TypeScript/Python pipelines mixing local + cloud models
- Offload low-complexity agents (chat, proofreading, extraction) to local inference, keep Claude/GPT for hard work
- Need: OpenAI-compatible API, auth per key, rate limits, token budgets, latency headers
- **Entry point:** Self-hosted Solon + Solon Cloud Pro ($19/mo)
- **Revenue:** Cloud Pro/Team subscriptions, multiple instances

### Segment C — Privacy-Regulated Orgs (Legal, Healthcare, Finance)
- Cannot send data to external APIs for compliance reasons
- Need audit logging, mandatory auth, data sovereignty
- Want managed infrastructure without DevOps overhead
- **Entry point:** Managed Hosting Pro ($49/mo) or GPU ($299/mo)
- **Revenue:** Managed hosting subscriptions, long-term contracts

### Segment D — AI Agencies & Consultants
- Build AI products for clients, need per-client isolation
- Deploy agent workflows (OpenClaw) with sandboxing and tier-based security
- **Entry point:** Managed Hosting + Solon Cloud Team ($49/mo)
- **Revenue:** Multiple managed instances per agency

---

## 3. Competitive Positioning

| | Ollama | LM Studio | vLLM | Cloud APIs | **Solon** |
|---|---|---|---|---|---|
| Auth | None by default | None | None | Provider-managed | **Mandatory** |
| API compat | Custom | None | OpenAI | Vendor-specific | **OpenAI-compatible** |
| Tunnel/remote | Manual | No | No | N/A | **Built-in (Cloudflare/Relay)** |
| Dashboard | No | Desktop app | No | Vendor console | **Embedded web UI** |
| Agent support | No | No | No | Via SDKs | **OpenClaw integrated** |
| Single binary | Yes | Desktop app | No (Python) | N/A | **Yes** |
| Managed hosting | No | No | No | Yes (expensive) | **$25/mo dedicated** |

**Core differentiator:** Security is mandatory, not opt-in. 175,000+ Ollama instances are exposed without auth. Solon has no `--no-auth` flag.

**Positioning statement:** Solon is Ollama + security + cloud access. For teams, it's the local inference layer in a hybrid AI pipeline.

---

## 4. Revenue Model

### Managed Hosting (NemoClaw on Hetzner)
| Tier | Price | Server | Margin Target |
|---|---|---|---|
| Starter | $25/mo | CX33 (4 vCPU, 8 GB) | ~40% |
| Pro | $49/mo | CX43 (8 vCPU, 16 GB) | ~50% |
| GPU | $299/mo | GEX44 (RTX 4000 Ada) | ~35% |

*Note: Hetzner price increase ~33% effective April 1, 2026 — re-evaluate Starter tier margin.*

### Solon Cloud (self-hosted + cloud dashboard)
| Tier | Price | Limits |
|---|---|---|
| Free | $0 | 1 instance, 60 req/min, Cloudflare Tunnel |
| Pro | $19/mo | 5 instances, 300 req/min, Relay, team access |
| Team | $49/mo | 50 instances, 1,000 req/min, 25 members, priority support |

### Revenue Mix Target (Month 6)
- 60% Managed Hosting (higher ARPU, stickier)
- 30% Solon Cloud subscriptions
- 10% Support/consulting

---

## 5. Launch Strategy

### Phase 1 — Hacker News Launch (Week 1)

**Goal:** 500 installs, 50 stars, 10 Cloud signups.

**HN Post:**
- Title: "Show HN: Solon — Self-hosted AI runtime with mandatory auth (no more exposed Ollama instances)"
- Lead with the 175,000 exposed Ollama instances stat
- Frame as security-first alternative, not yet-another-inference-tool
- Include install one-liner and 30-second GIF of install → model pull → API call → dashboard

**Supporting content:**
- Blog post on getsolon.dev: "Why we made auth mandatory" (security angle)
- README with clear quickstart
- Comparison table vs Ollama/LM Studio on landing page

### Phase 2 — Developer Community Seeding (Weeks 2-4)

**Channels:**
- r/LocalLLaMA, r/selfhosted — "I built X" posts with real usage numbers
- AI-focused Discord servers (Nous Research, TheBloke, LocalLLaMA)
- Dev.to / Hashnode blog posts: practical tutorials
  - "Run Llama 3 locally with auth in 60 seconds"
  - "Hybrid AI pipelines: local inference for cheap tasks, Claude for the hard ones"
  - "Replace your Ollama setup with something secure"

**Content calendar (first month):**
| Week | Content | Channel |
|---|---|---|
| 1 | HN launch + "Why mandatory auth" blog | HN, getsolon.dev |
| 2 | Tutorial: hybrid pipeline with Solon + Claude | Dev.to, r/LocalLLaMA |
| 3 | "From Ollama to Solon in 5 minutes" migration guide | Blog, Reddit |
| 4 | Case study: pipeline team saving 60% on inference | Blog, HN comment |

### Phase 3 — Managed Hosting Push (Weeks 4-8)

**Goal:** 20 paying managed hosting customers.

**Tactics:**
- Targeted outreach to AI agencies and consultants (LinkedIn, Twitter DMs)
- "Deploy in 2 minutes" demo video on landing page
- Free trial: 7-day Starter tier, no credit card
- Partner with AI newsletter authors for sponsored mentions
- SEO: "self-hosted AI server", "private AI hosting", "Ollama alternative secure"

### Phase 4 — Pipeline & Enterprise (Months 2-3)

**Goal:** 5 team/enterprise accounts.

**Tactics:**
- Ship v1.2 features (model warmup API, token budgets, JSON mode, streaming usage) — validated by real pipeline team feedback
- Publish "Solon for production pipelines" guide
- Direct outreach to TypeScript/Python AI framework communities
- Integration guides: LangChain + Solon, Vercel AI SDK + Solon, OpenClaw + Solon

---

## 6. Landing Page (getsolon.dev)

### Current Structure
1. Hero: "Your AI. Your rules." + install one-liner
2. Features: one-command install, OpenAI-compatible, mandatory auth, secure tunnel, web dashboard, model management
3. Security banner: 175,000 exposed Ollama instances
4. Install command CTA
5. Pricing: Managed Hosting tiers + Solon Cloud tiers

### Recommended Additions
- **Social proof section:** GitHub stars count, install count, "used by X teams"
- **30-second demo GIF/video** below the hero — install, pull model, make API call, see dashboard
- **Comparison table** (Solon vs Ollama vs LM Studio vs vLLM) — already have ComparisonTable component, wire it up
- **"Hybrid pipeline" section** targeting Segment B — show architecture diagram of local models + cloud models
- **Testimonial/quote** from v1.2 proposal user: *"We want to offload low-complexity agents to Solon and keep Claude for the hard creative work"*

---

## 7. Key Metrics

### North Star
**Weekly active instances** — self-hosted instances that made at least 1 API call in the past 7 days (reported via Cloud dashboard or relay ping).

### Funnel Metrics
| Stage | Metric | Week 1 Target | Month 1 Target |
|---|---|---|---|
| Awareness | getsolon.dev unique visitors | 2,000 | 8,000 |
| Install | `curl` install completions | 500 | 2,000 |
| Activation | First API call within 24h of install | 200 | 800 |
| Cloud signup | Free tier registration | 50 | 200 |
| Paid conversion | Cloud Pro/Team or Managed Hosting | 5 | 30 |
| Retention | Active instance after 30 days | — | 40% |

### Revenue Targets
| | Month 1 | Month 3 | Month 6 |
|---|---|---|---|
| MRR | $500 | $2,500 | $8,000 |
| Managed customers | 5 | 15 | 40 |
| Cloud paid | 10 | 50 | 150 |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Ollama adds auth | Core differentiator weakened | Expand positioning to managed hosting + agent platform (OpenClaw), not just "secure Ollama" |
| Hetzner price increases | Managed hosting margins shrink | Already priced with buffer; GPU tier has healthiest margin. Monitor and adjust Starter if needed |
| Low HN traction | Slow initial growth | Have Reddit/Discord seeding ready as backup channel. Content marketing is a slower burn but compounds |
| Managed hosting ops burden | Support costs eat margin | Automate provisioning (Ansible done), monitoring, and alerts. Keep Starter tier simple |
| Apple Silicon focus limits market | Misses Linux/GPU users | Already support llama.cpp on Linux + CUDA. Managed hosting (Hetzner) covers non-Mac users |

---

## 9. 90-Day Roadmap (GTM-Aligned)

| Week | Product | GTM |
|---|---|---|
| 1 | Polish install script, ensure `curl \| sh` works flawlessly | HN launch, blog post |
| 2 | Ship v1.2 Tier 1 (warmup API, health readiness, latency headers, token budgets) | Dev community seeding |
| 3 | Comparison table on landing page, demo video | Migration guide content |
| 4 | Ship v1.2 Tier 2 (JSON mode, streaming usage) | Managed hosting push begins |
| 5-6 | Free trial flow for managed hosting, Stripe billing polish | Agency outreach |
| 7-8 | Integration guides (LangChain, Vercel AI SDK) | Pipeline/enterprise outreach |
| 9-12 | OpenClaw agent dashboard, channel integrations (Slack, Telegram) | "Agents, not just inference" positioning |

---

## 10. Success Criteria (90 Days)

- [ ] 2,000+ installs
- [ ] 200+ GitHub stars
- [ ] 30+ paying customers (Cloud + Managed)
- [ ] $2,500+ MRR
- [ ] 1 case study published from a real production user
- [ ] getsolon.dev ranking for "self-hosted AI", "Ollama alternative", "private AI server"
