# Solon — Product Requirements Document

> **Your AI. Your rules.**

## 1. Product Overview

Solon is a single-binary application that lets anyone run AI models locally and access them securely from the web via API keys. It combines Ollama-level simplicity for local inference with mandatory authentication, secure tunnel exposure, and a built-in web dashboard — everything needed to self-host AI safely.

Solon works standalone as a personal AI server and as the inference backend for the OpenClaw agent framework, forming a fully sovereign AI stack.

## 2. Problem Statement

Running AI models locally has gotten easy. Accessing them securely from the web has not.

- **Ollama** makes local inference simple but has no authentication, no remote access story, and no usage tracking. Over 175,000 Ollama instances are exposed to the internet without any auth — a massive security risk.
- **vLLM / TGI** are production-grade but require DevOps expertise, Docker, and significant infrastructure.
- **LM Studio** is GUI-only with no API key auth or remote access.
- **LocalAI** attempts this space but lacks polish, auth, and tunnel integration.

No product combines: simplicity + security + remote access + monitoring.

Solon fills this gap.

## 3. Target Users

| Persona | Need |
|---------|------|
| **Solo developer** | Run models locally, call from deployed apps via API key |
| **Small team (2-10)** | Shared inference server with per-user keys and usage tracking |
| **Privacy-conscious org** | Must keep data on-premises, needs audit trail |
| **OpenClaw user** | Wants local inference backend for agents without cloud API costs |
| **AI hobbyist** | Wants to experiment with models and share access with friends |

## 4. Core Features (MVP — v0.1)

### 4.1 One-Command Install

```bash
# macOS
brew install solon

# Linux / macOS (universal)
curl -fsSL https://getsolon.dev | sh
```

Single binary, no Docker, no Python, no dependencies.

### 4.2 Model Management

```bash
solon models pull llama3.2:8b       # Download a model
solon models list                    # List installed models
solon models remove llama3.2:8b     # Remove a model
solon models info llama3.2:8b       # Show model details
```

Forked from Ollama's proven model management system. Supports GGUF models via llama.cpp.

### 4.3 OpenAI-Compatible API

Drop-in replacement for OpenAI API. Works with any OpenAI SDK.

**Endpoints:**
- `POST /v1/chat/completions` — Chat completions (streaming + non-streaming)
- `POST /v1/completions` — Text completions
- `POST /v1/embeddings` — Text embeddings
- `GET /v1/models` — List available models

**Example:**
```bash
curl http://localhost:8420/v1/chat/completions \
  -H "Authorization: Bearer sol_sk_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:8b",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 4.4 API Key Authentication (Mandatory)

Auth is always on. There is no `--no-auth` flag.

```bash
solon keys create --name "my-app"        # Create a key
solon keys list                          # List all keys
solon keys revoke sol_sk_live_xxxx       # Revoke a key
```

**Key format:**
```
sol_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
|   |   |    |
|   |   |    +-- 28 chars cryptographic randomness (168 bits)
|   |   +------- environment (live/test)
|   +----------- secret key
+--------------- solon prefix
```

- Keys are bcrypt-hashed before storage (only shown once on creation)
- First key auto-created on `solon serve` if none exist
- Rate limits configurable per key

### 4.5 Secure Tunnel

```bash
solon tunnel enable          # Expose via Cloudflare Tunnel (free)
solon tunnel disable         # Close tunnel
solon tunnel status          # Show tunnel URL and status
```

Uses Cloudflare Tunnel (free tier) to expose the API securely to the internet without port forwarding, static IPs, or DNS configuration.

### 4.6 Web Dashboard

Accessible at `http://localhost:8420` (embedded in the binary via `go:embed`).

**Dashboard pages:**
- **Overview**: System health, GPU/CPU utilization, active model, uptime
- **Models**: Browse, pull, remove models; see size, quantization, last used
- **API Keys**: Create, revoke, view usage per key; copy key on creation
- **Request Log**: Recent API requests with latency, tokens, model, key used
- **Settings**: Port config, tunnel settings, auto-start preferences

### 4.7 OpenClaw Integration

Solon registers as an OpenClaw provider:

```json
{
  "auth": {
    "profiles": {
      "solon:local": {
        "provider": "solon",
        "mode": "local",
        "endpoint": "http://localhost:8420"
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "solon/llama3.2:8b"
      }
    }
  }
}
```

### 4.8 Platform Support

| Platform | Architecture | Backend |
|----------|-------------|---------|
| macOS | ARM64 (Apple Silicon) | llama.cpp (Metal) |
| macOS | x86_64 (Intel) | llama.cpp (CPU) |
| Linux | ARM64 | llama.cpp (CPU/CUDA) |
| Linux | x86_64 | llama.cpp (CPU/CUDA) |

## 5. v0.2 Features

- **MLX backend** for Apple Silicon (faster than llama.cpp on M-series)
- **Usage analytics** — token counts, cost estimates, per-key usage dashboards
- **Model tiering** — assign models to keys (e.g., key A can only use small models)
- **Solon Relay** — paid managed tunnel with stable URLs and DDoS protection
- **Key scoping** — restrict keys to specific models or endpoints

## 6. v1.0 Features

- **Teams** — multi-user with roles (admin, member, viewer)
- **SSO** — SAML/OIDC for enterprise auth
- **Webhooks** — notify on events (model loaded, key created, error threshold)
- **Multi-node clustering** — distribute inference across machines
- **Fine-tuning** — LoRA fine-tuning via dashboard

## 7. Security Architecture

Security is Solon's primary differentiator over Ollama.

| Layer | Protection |
|-------|-----------|
| **Network** | Inference engine binds to Unix socket only; Gateway handles all TCP |
| **Authentication** | Mandatory API keys on every request; no disable option |
| **Key storage** | bcrypt-hashed; raw key shown once on creation |
| **Rate limiting** | Token bucket per key; configurable burst and sustained rates |
| **Audit logging** | Every request logged with timestamp, key ID, model, tokens, latency |
| **Tunnel security** | Cloudflare DDoS protection; encrypted tunnel; no open ports |
| **Dashboard** | Accessible only from localhost by default; auth required for remote |

### Security non-negotiables:
1. Auth cannot be disabled
2. Keys are never stored in plaintext
3. Inference engine is never directly exposed to network
4. All defaults are secure (no opt-in security)

## 8. API Design

### Inference API (OpenAI-compatible)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/chat/completions` | Chat completions |
| POST | `/v1/completions` | Text completions |
| POST | `/v1/embeddings` | Embeddings |
| GET | `/v1/models` | List models |

### Management API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/keys` | List API keys |
| POST | `/api/v1/keys` | Create API key |
| DELETE | `/api/v1/keys/:id` | Revoke API key |
| GET | `/api/v1/models` | List models with details |
| POST | `/api/v1/models/pull` | Pull a model |
| DELETE | `/api/v1/models/:name` | Delete a model |
| GET | `/api/v1/analytics/requests` | Request log |
| GET | `/api/v1/analytics/usage` | Usage stats |
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/tunnel/status` | Tunnel status |
| POST | `/api/v1/tunnel/enable` | Enable tunnel |
| POST | `/api/v1/tunnel/disable` | Disable tunnel |

### Authentication

All requests require `Authorization: Bearer sol_sk_live_xxxx` header.

Management API additionally requires the key to have `admin` scope (first key created is always admin).

## 9. CLI Commands

```
solon serve                    # Start the daemon (default port 8420)
solon serve --port 9000        # Custom port

solon models pull <model>      # Download a model
solon models list              # List installed models
solon models remove <model>    # Remove a model
solon models info <model>      # Show model details

solon keys create --name <n>   # Create an API key
solon keys list                # List all keys
solon keys revoke <key>        # Revoke a key

solon tunnel enable            # Enable Cloudflare Tunnel
solon tunnel disable           # Disable tunnel
solon tunnel status            # Show tunnel status

solon status                   # Show daemon status
solon version                  # Show version info
```

## 10. Business Model

| Tier | Price | Features |
|------|-------|----------|
| **Free (OSS)** | $0 | Full inference, unlimited keys, Cloudflare Tunnel, dashboard, CLI |
| **Pro** | $9/mo | Solon Relay (stable URL), DDoS protection, 100GB bandwidth |
| **Team** | $19/mo | Multi-user, shared keys, webhooks, 500GB bandwidth |
| **Enterprise** | $49+/mo | SSO, SLA, audit export, unlimited bandwidth, dedicated relay |

The open-source core is MIT licensed and fully functional. Revenue comes from managed infrastructure (Solon Relay) and team/enterprise features.

## 11. Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| GitHub stars | 5,000 |
| Weekly active instances | 1,000 |
| Models served per day | 10,000 requests |
| Pro subscribers | 100 |
| Uptime (Relay) | 99.9% |

## 12. Technical Constraints

- Single binary distribution (no Docker required)
- < 50MB binary size (excluding models)
- < 100ms API gateway overhead
- SQLite for all local storage (no external databases)
- Must work offline (except tunnel and model downloads)
