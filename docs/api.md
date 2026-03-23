# Solon API Reference

Base URL:
- **Local:** `http://localhost:8420`
- **Remote:** `https://relay.getsolon.dev/{instance_id}` (when running with `--remote`)

## Authentication

All API requests require a Bearer token:

```
Authorization: Bearer sol_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Localhost requests (dashboard) bypass auth automatically.

## Quick Start

```bash
# 1. Start Solon with remote access
solon serve --remote

# 2. Pull a model
solon models pull llama3.2:3b

# 3. Chat (locally)
curl http://localhost:8420/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","messages":[{"role":"user","content":"Hello"}]}'

# 4. Chat (remotely — from any device/network)
curl https://relay.getsolon.dev/YOUR_INSTANCE_ID/v1/chat/completions \
  -H "Authorization: Bearer sol_sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","messages":[{"role":"user","content":"Hello"}]}'
```

## Remote Access

Solon Relay lets you access your local AI from anywhere. No port forwarding, no Cloudflare account, no setup.

```bash
solon serve --remote
# → Remote: https://relay.getsolon.dev/73f2c97fc88a19d2964d1daa
```

The URL is permanent — it survives restarts. Your instance ID is stored in `~/.solon/relay.json`.

**How it works:** Solon opens an outbound WebSocket to `relay.getsolon.dev`. The relay assigns a stable URL. Requests to that URL get proxied to your local Solon. Auth happens locally — the relay is just transport.

### Remote Access Status

```
GET /api/v1/remote/status
```

**Response:**
```json
{
  "enabled": true,
  "url": "https://relay.getsolon.dev/73f2c97fc88a19d2964d1daa",
  "instance_id": "73f2c97fc88a19d2964d1daa",
  "provider": "solon-relay"
}
```

---

## Inference API (OpenAI-Compatible)

Drop-in replacement for the OpenAI API. Works with any OpenAI SDK by changing the base URL.

### POST /v1/chat/completions

```json
{
  "model": "llama3.2:3b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}
```

**Response:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1708300800,
  "model": "llama3.2:3b",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Hello! How can I help you today?"},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 20, "completion_tokens": 9, "total_tokens": 29}
}
```

Streaming: set `"stream": true` to receive Server-Sent Events.

### POST /v1/completions

Text completion (non-chat).

```json
{
  "model": "llama3.2:3b",
  "prompt": "The meaning of life is",
  "max_tokens": 100
}
```

### POST /v1/embeddings

```json
{
  "model": "nomic-embed-text",
  "input": "Hello world"
}
```

Input accepts a string or array of strings.

### GET /v1/models

List available models (OpenAI-compatible format).

---

## Anthropic Pass-Through Proxy

Transparent reverse proxy for the Anthropic Messages API. Accepts Anthropic-native request format, swaps the API key with the stored Anthropic provider key, and forwards to the upstream. Response is streamed back unchanged.

Requires an `anthropic` provider to be configured via `POST /api/v1/providers`.

### POST /v1/messages

Auth: `Authorization: Bearer sol_sk_live_...` or `x-api-key: sol_sk_live_...`

```bash
curl http://localhost:8420/v1/messages \
  -H "x-api-key: sol_sk_live_YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Response:** Anthropic-native format (passed through from upstream).

```json
{
  "id": "msg_01...",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-20250514",
  "content": [{"type": "text", "text": "Hello! How can I help you?"}],
  "stop_reason": "end_turn",
  "usage": {"input_tokens": 10, "output_tokens": 12}
}
```

Streaming: set `"stream": true` in the request body. Response uses Anthropic SSE format.

The `anthropic-beta` header is forwarded if present.

---

## API Key Management

### POST /api/v1/keys

Create a new API key with optional restrictions.

```json
{
  "name": "my-app",
  "scope": "user",
  "rate_limit": 30,
  "ttl_seconds": 2592000,
  "allowed_models": ["llama3.2:3b", "mistral:7b"],
  "tunnel_access": true
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | required | Human-readable name |
| `scope` | string | `"user"` | `"admin"` or `"user"` |
| `rate_limit` | int | `60` | Requests per minute |
| `ttl_seconds` | int | — | Key expiry (e.g. 2592000 = 30 days) |
| `allowed_models` | string[] | all | Restrict to specific models |
| `tunnel_access` | bool | `true` | Allow use via tunnel/relay |

**Response (201):**
```json
{
  "key": "sol_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "my-app",
  "id": "uuid"
}
```

Save the key — it's only shown once.

### GET /api/v1/keys

List all active API keys (hashes never exposed).

### DELETE /api/v1/keys/:id

Revoke an API key.

---

## Model Management

### GET /api/v1/models/catalog

Browse available models with metadata, sizes, and VRAM requirements.

```json
{
  "models": [{
    "name": "llama3.2",
    "description": "Meta's latest open source LLM...",
    "creator": "Meta",
    "sizes": ["3b", "8b"],
    "category": "chat",
    "capabilities": ["chat", "reasoning"],
    "context": 128000,
    "vram": {"3b": 2.0, "8b": 4.7}
  }]
}
```

### POST /api/v1/models/pull

Pull a model. Set `"stream": true` for SSE progress events.

```json
{"name": "llama3.2:3b", "stream": true}
```

### DELETE /api/v1/models/:name

Delete an installed model.

### GET /api/v1/models/loaded

List currently loaded models in memory (multi-model engine).

---

## Analytics

### GET /api/v1/analytics/usage

Aggregated usage statistics.

```json
{
  "total_requests": 1000,
  "total_tokens_in": 50000,
  "total_tokens_out": 100000,
  "avg_latency_ms": 350.5,
  "requests_today": 42,
  "unique_keys_used": 3,
  "most_used_model": "llama3.2:3b"
}
```

### GET /api/v1/analytics/requests

Last 100 API requests with method, model, tokens, latency, status.

### GET /api/v1/analytics/usage/keys

Per-key usage (request count + total tokens).

---

## CLI Reference

```bash
# Server
solon serve                          # Start on :8420
solon serve --remote                 # Enable remote access via relay
solon serve --tunnel                 # Enable Cloudflare tunnel
solon serve --port 9000              # Custom port
solon serve --preload llama3.2:3b    # Preload models at startup
solon serve --memory-budget 8192     # Memory budget in MB

# Models
solon models pull llama3.2:3b        # Download a model
solon models list                    # List installed models
solon models remove llama3.2:3b      # Delete a model
solon models info llama3.2:3b        # Show model details
solon models known                   # List all known model names
solon models add mymodel org/repo    # Add custom HuggingFace mapping

# API Keys
solon keys create --name my-app                     # Basic key
solon keys create --name ci --ttl 30d               # Expires in 30 days
solon keys create --name app --models "llama3.2:3b"  # Model-restricted
solon keys create --name app --rate-limit 10        # 10 req/min
solon keys create --name local --no-tunnel          # No remote access
solon keys list                                      # List all keys
solon keys revoke <id-or-key>                        # Revoke a key

# Tunnel (alternative to relay)
solon tunnel setup                   # One-time Cloudflare named tunnel setup
solon tunnel enable                  # Start tunnel
solon tunnel status                  # Show tunnel info

# Other
solon status                         # Check if daemon is running
solon version                        # Show version
solon update                         # Update to latest version
```

## Using with OpenAI SDKs

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://relay.getsolon.dev/YOUR_INSTANCE_ID/v1",
    api_key="sol_sk_live_YOUR_KEY",
)

response = client.chat.completions.create(
    model="llama3.2:3b",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)
```

### JavaScript/TypeScript

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://relay.getsolon.dev/YOUR_INSTANCE_ID/v1',
  apiKey: 'sol_sk_live_YOUR_KEY',
});

const response = await client.chat.completions.create({
  model: 'llama3.2:3b',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### curl

```bash
curl https://relay.getsolon.dev/YOUR_INSTANCE_ID/v1/chat/completions \
  -H "Authorization: Bearer sol_sk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","messages":[{"role":"user","content":"Hello"}]}'
```

## Error Responses

```json
{
  "error": {
    "message": "description of what went wrong",
    "type": "Unauthorized"
  }
}
```

| Status | Meaning |
|--------|---------|
| 401 | Missing or invalid API key |
| 403 | Key lacks permission (model restriction, tunnel access, admin scope) |
| 429 | Rate limit exceeded (see `Retry-After` header) |
| 502 | Solon instance offline (remote access) |
| 504 | Request timed out |

## Rate Limiting

Per-key token bucket. Default: 60 requests/minute. Customizable per key. Returns `429` with `Retry-After: 1` header when exceeded.
