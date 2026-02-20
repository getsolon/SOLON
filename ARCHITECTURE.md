# Solon — Technical Architecture

## Overview

Solon is a Go monolith that compiles to a single binary. It embeds an inference engine (forked from Ollama), an API gateway with mandatory authentication, a SQLite database, a web dashboard, and a tunnel manager.

```
┌──────────────────────────────────────────────────────────────┐
│                        solon binary                          │
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐  │
│  │   CLI   │  │ Gateway  │  │ Engine  │  │  Dashboard   │  │
│  │ (cobra) │  │ (HTTP)   │  │(Ollama) │  │  (React)     │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬───────┘  │
│       │            │             │               │           │
│       │       ┌────▼─────┐      │          ┌────▼───────┐   │
│       │       │   Auth   │      │          │  go:embed  │   │
│       │       │  (keys)  │      │          │  (static)  │   │
│       │       └────┬─────┘      │          └────────────┘   │
│       │            │             │                            │
│       │       ┌────▼─────────────▼────┐                      │
│       │       │       SQLite          │                      │
│       │       │   (WAL mode)          │                      │
│       │       └───────────────────────┘                      │
│       │                                                      │
│  ┌────▼──────────────────┐                                   │
│  │    Tunnel Manager     │                                   │
│  │ (Cloudflare / Relay)  │                                   │
│  └───────────────────────┘                                   │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | Go 1.22+ | Ollama is Go; excellent for single-binary CLI + server; fast compilation |
| CLI | Cobra | Industry standard for Go CLIs; used by kubectl, gh, docker |
| HTTP Server | net/http + chi | Standard library server with chi router for middleware |
| Inference | Forked Ollama | Proven model management, llama.cpp bindings, Metal/CUDA support |
| Storage | SQLite (mattn/go-sqlite3) | Zero external dependencies, WAL mode for concurrent reads |
| Dashboard | React + Vite | Modern SPA, embedded via go:embed at build time |
| Tunnel | Cloudflare Tunnel | Free tier, DDoS protection, custom domains, no port forwarding |
| Auth | bcrypt + crypto/rand | Industry standard password hashing for API key storage |

## Architecture Deep-Dive

### Request Flow

```
Client Request
     │
     ▼
┌─────────────┐
│   Gateway    │  ← TCP :8420
│  (net/http)  │
└──────┬──────┘
       │
  ┌────▼────┐
  │  Auth   │  ← Validate API key (bcrypt compare)
  └────┬────┘
       │
  ┌────▼─────┐
  │  Rate    │  ← Token bucket per key
  │  Limit   │
  └────┬─────┘
       │
  ┌────▼──────┐
  │ Middleware │  ← Logging, CORS, request ID
  └────┬──────┘
       │
  ┌────▼──────────┐
  │    Router      │
  └──┬─────┬──────┘
     │     │
     │     ▼
     │  ┌──────────┐
     │  │Dashboard │  ← Serve static files (go:embed)
     │  └──────────┘
     │
     ▼
  ┌──────────────┐
  │   Inference   │  ← Unix socket to Ollama engine
  │   Engine      │
  └──────┬───────┘
         │
    ┌────▼────┐
    │llama.cpp│  ← Model loading, inference
    └─────────┘
```

### Component Architecture

#### 1. Gateway (`internal/gateway/`)

The API gateway is the only component that listens on TCP. It handles:

- **Authentication** (`auth.go`): Every request validated against bcrypt-hashed API keys in SQLite. Keys are looked up by prefix hash for efficient matching.
- **Rate limiting** (`ratelimit.go`): Token bucket algorithm per API key. Configurable burst and sustained rates.
- **Middleware** (`middleware.go`): Request logging, CORS headers, request IDs, response timing.
- **Routing** (`gateway.go`): Routes to inference engine, management API, or dashboard.

```go
// Gateway is the main HTTP server
type Gateway struct {
    router     chi.Router
    engine     *inference.Engine
    store      *storage.DB
    tunnel     tunnel.Tunnel
    listenAddr string
}
```

#### 2. Inference Engine (`internal/inference/`)

Forked from Ollama's core inference system. Manages model lifecycle and serves completions.

- **Engine** (`engine.go`): Orchestrates model loading, unloading, and inference requests. Communicates with backends via a common interface.
- **Models** (`models.go`): Pull, list, delete, inspect models. Uses Ollama's model registry format.
- **Backends** (`backends/`): Abstraction layer for inference runtimes.

```go
// Backend is the interface all inference backends implement
type Backend interface {
    Name() string
    Available() bool
    LoadModel(ctx context.Context, model *Model) error
    UnloadModel(ctx context.Context, model *Model) error
    Complete(ctx context.Context, req *CompletionRequest) (*CompletionResponse, error)
    CompleteStream(ctx context.Context, req *CompletionRequest) (<-chan CompletionChunk, error)
    Embeddings(ctx context.Context, req *EmbeddingRequest) (*EmbeddingResponse, error)
}
```

**Backend implementations:**
- `llamacpp.go`: llama.cpp via CGo bindings (from Ollama). Supports CPU, Metal (macOS), CUDA (Linux).
- `mlx.go`: MLX backend for Apple Silicon (v0.2). Calls MLX via subprocess.

#### 3. Tunnel Manager (`internal/tunnel/`)

Manages secure tunnel connections to expose the local API to the internet.

```go
// Tunnel is the interface for tunnel providers
type Tunnel interface {
    Enable(ctx context.Context) error
    Disable(ctx context.Context) error
    Status(ctx context.Context) (*TunnelStatus, error)
    URL() string
}
```

**Implementations:**
- `cloudflare.go`: Cloudflare Tunnel (free). Spawns `cloudflared` as a subprocess.
- `relay.go`: Solon Relay (paid). WebSocket connection to relay.solon.dev.

#### 4. Storage (`internal/storage/`)

SQLite database in WAL mode for concurrent access.

```sql
-- API Keys
CREATE TABLE api_keys (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    prefix      TEXT NOT NULL,       -- First 8 chars for lookup
    hash        TEXT NOT NULL,       -- bcrypt hash of full key
    scope       TEXT DEFAULT 'user', -- admin, user
    rate_limit  INTEGER DEFAULT 60,  -- requests per minute
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used   DATETIME,
    revoked     BOOLEAN DEFAULT FALSE
);

-- Request Log
CREATE TABLE requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id      TEXT REFERENCES api_keys(id),
    method      TEXT NOT NULL,
    path        TEXT NOT NULL,
    model       TEXT,
    tokens_in   INTEGER,
    tokens_out  INTEGER,
    latency_ms  INTEGER,
    status_code INTEGER,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Models (cache of installed models)
CREATE TABLE models (
    name        TEXT PRIMARY KEY,
    size_bytes  INTEGER,
    format      TEXT,
    family      TEXT,
    params      TEXT,
    quantization TEXT,
    pulled_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used   DATETIME
);
```

#### 5. Dashboard (`internal/dashboard/`, `dashboard/`)

React SPA built with Vite, embedded in the Go binary via `go:embed`.

The `dashboard/` directory contains the React source. At build time, `make build-dashboard` compiles it to `dashboard/dist/`. The Go file `internal/dashboard/embed.go` embeds the `dist/` directory:

```go
//go:embed all:dist
var staticFiles embed.FS
```

The Gateway serves these files for any non-API request to `localhost:8420`.

#### 6. OpenClaw Integration (`internal/openclaw/`)

Provider plugin interface for OpenClaw compatibility.

```go
// Provider implements the OpenClaw provider interface
type Provider struct {
    engine   *inference.Engine
    endpoint string
}

func (p *Provider) ListModels() []ModelInfo { ... }
func (p *Provider) Complete(req CompletionRequest) (*CompletionResponse, error) { ... }
```

## Fork Strategy

Solon forks Ollama rather than building from scratch. Here's what we keep and what we replace:

| Ollama Component | Solon Action | Rationale |
|-----------------|-------------|-----------|
| Model management (pull/list/delete) | **Keep** | Proven, handles GGUF format well |
| llama.cpp bindings | **Keep** | Complex CGo code, well-tested |
| Metal/CUDA support | **Keep** | Hardware acceleration is critical |
| HTTP server | **Replace** | Solon Gateway handles all HTTP |
| Model registry format | **Keep** | Compatible with Ollama model library |
| Modelfile format | **Keep** | Users familiar with it |
| REST API | **Replace** | OpenAI-compatible API instead |

The fork point is Ollama's `llm/` package. Solon imports it as a library, wrapping it in the Backend interface.

## Key Decisions

### Why Go?
- Ollama is written in Go — forking requires Go
- Compiles to a single static binary — no runtime dependencies
- Excellent standard library for HTTP servers
- Fast compilation for rapid development
- Good CGo support for llama.cpp bindings

### Why SQLite?
- Zero external dependencies (embedded in binary)
- WAL mode handles concurrent reads from dashboard + API
- More than sufficient for local key management and analytics
- Data stays local — no external database to secure

### Why Single Binary?
- Best possible UX: download → run → done
- No Docker, no Python, no package managers required
- Dashboard embedded via go:embed
- Models are the only external dependency (downloaded on demand)

### Why Fork Ollama?
- Ollama solved the hard problems: llama.cpp bindings, model management, Metal/CUDA support
- Building from scratch would take months with no user benefit
- Fork lets us focus on what matters: security, auth, tunnel, dashboard
- We can upstream improvements and pull updates

### Why Not Just Wrap Ollama?
- Wrapping adds latency and complexity (two processes, IPC)
- Can't control security at the inference level
- Can't embed the inference engine in our binary
- Fork gives us full control with minimal maintenance burden

### Why Port 8420?
- Not commonly used by other services
- Easy to remember
- Doesn't conflict with common dev ports (3000, 5000, 8000, 8080)

## Security Architecture

### Network Isolation

```
Internet                   localhost only
   │                           │
   ▼                           ▼
┌──────┐    ┌─────────┐   ┌────────┐
│Tunnel│───▶│ Gateway │──▶│ Engine │
└──────┘    │ :8420   │   │ (unix) │
            └─────────┘   └────────┘
                 │
            ┌────▼────┐
            │ SQLite  │
            └─────────┘
```

The inference engine never binds to TCP. It only communicates via Unix socket with the Gateway. The Gateway is the only TCP listener. The tunnel connects to the Gateway, not the engine.

### API Key Lifecycle

1. **Creation**: `solon keys create --name "my-app"`
   - Generate 28 bytes of cryptographic randomness
   - Format as `sol_sk_live_` + base62 encoding
   - bcrypt-hash the full key
   - Store hash + first 8 chars (prefix) in SQLite
   - Display full key to user (only time it's shown)

2. **Authentication**: On every request
   - Extract key from `Authorization: Bearer` header
   - Look up candidates by prefix (first 8 chars)
   - bcrypt-compare against stored hash
   - Check not revoked, check rate limit
   - Log request to analytics

3. **Revocation**: `solon keys revoke sol_sk_live_xxxx`
   - Mark key as revoked in SQLite
   - Immediately reject all requests using this key
   - Key cannot be un-revoked (create a new one)

### Rate Limiting

Token bucket algorithm per API key:
- Default: 60 requests/minute, burst of 10
- Configurable per key via management API
- Returns `429 Too Many Requests` with `Retry-After` header

## Build & Distribution

### Build Process

```makefile
# Build dashboard
build-dashboard:
    cd dashboard && npm run build

# Build Go binary (includes embedded dashboard)
build: build-dashboard
    CGO_ENABLED=1 go build -o bin/solon ./cmd/solon

# Cross-compile
build-all: build-dashboard
    GOOS=darwin GOARCH=arm64 go build -o bin/solon-darwin-arm64 ./cmd/solon
    GOOS=darwin GOARCH=amd64 go build -o bin/solon-darwin-amd64 ./cmd/solon
    GOOS=linux GOARCH=arm64 go build -o bin/solon-linux-arm64 ./cmd/solon
    GOOS=linux GOARCH=amd64 go build -o bin/solon-linux-amd64 ./cmd/solon
```

### Data Directory

```
~/.solon/
├── solon.db          # SQLite database (keys, analytics, model cache)
├── models/           # Downloaded model files
├── logs/             # Request logs (rotated)
└── config.yaml       # User configuration (optional)
```

## OpenClaw Integration Details

Solon exposes an OpenClaw-compatible provider interface:

1. **Discovery**: OpenClaw looks for Solon at `localhost:8420` or configured endpoint
2. **Auth**: OpenClaw uses a Solon API key stored in its auth config
3. **Models**: OpenClaw queries `/v1/models` to discover available models
4. **Inference**: OpenClaw sends completion requests to `/v1/chat/completions`
5. **Model naming**: Models are prefixed with `solon/` in OpenClaw (e.g., `solon/llama3.2:8b`)

The integration is purely API-based — no shared libraries or tight coupling.
