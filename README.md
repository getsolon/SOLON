# Solon

**Your AI. Your rules.**

Solon is a self-hosted AI runtime with mandatory auth, secure tunnel access, and an OpenAI-compatible API. Single binary. No Docker. No dependencies.

## Install

```bash
curl -fsSL https://getsolon.dev | sh
```

Or with Homebrew:

```bash
brew install solon
```

## Quickstart

```bash
# Start the server (auto-creates your first admin API key)
solon serve

# Pull a model
solon models pull llama3.2:3b

# Make a request
curl http://localhost:8420/v1/chat/completions \
  -H "Authorization: Bearer sol_sk_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","messages":[{"role":"user","content":"Hello!"}]}'
```

The dashboard is at [http://localhost:8420](http://localhost:8420).

## Features

- **Single binary** -- one command to install, one file to run
- **OpenAI-compatible API** -- works with any OpenAI SDK (just change the base URL)
- **Mandatory auth** -- API keys on every request, bcrypt-hashed, rate-limited, audit-logged
- **Secure tunnel** -- expose your API via Cloudflare Tunnel, no port forwarding needed
- **Web dashboard** -- manage models, keys, and monitor requests from your browser (PWA-installable)
- **Model management** -- pull, list, info, and remove models from the CLI

## CLI

```
solon serve                         Start the server
solon models pull <model>           Download a model
solon models list                   List installed models
solon models info <model>           Show model details
solon models remove <model>         Remove a model
solon keys create --name <name>     Create a user-scoped API key
solon keys create --name <n> --scope admin  Create an admin API key
solon keys list                     List all keys
solon keys revoke <key-or-id>       Revoke a key
solon tunnel enable                 Start Cloudflare Tunnel
solon tunnel status                 Show tunnel URL
solon status                        Check if the daemon is running
```

## API

All inference endpoints are OpenAI-compatible:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | Chat completions (streaming + non-streaming) |
| `POST` | `/v1/completions` | Text completions |
| `POST` | `/v1/embeddings` | Text embeddings |
| `GET` | `/v1/models` | List models |

Management endpoints require admin scope for remote access:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check (no auth) |
| `GET/POST/DELETE` | `/api/v1/keys` | Key management |
| `GET/POST/DELETE` | `/api/v1/models` | Model management |
| `GET` | `/api/v1/analytics/*` | Request log and usage stats |
| `GET/POST` | `/api/v1/tunnel/*` | Tunnel management |

## Build from source

```bash
git clone https://github.com/openclaw/solon.git
cd solon
make setup        # Initialize submodules and build llama.cpp
make build        # Build the binary (includes dashboard)
make test         # Run tests
```

## Security

Security is Solon's primary differentiator. Auth cannot be disabled. Keys are bcrypt-hashed and shown only once. The inference engine binds to a Unix socket -- only the gateway handles TCP. Every request is logged with timestamps, key ID, model, tokens, and latency.

## License

MIT
