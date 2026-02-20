# Solon API Reference

## Authentication

All API requests require authentication via Bearer token:

```
Authorization: Bearer sol_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Inference API (OpenAI-Compatible)

### POST /v1/chat/completions

Create a chat completion.

**Request:**
```json
{
  "model": "llama3.2:8b",
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
  "model": "llama3.2:8b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 9,
    "total_tokens": 29
  }
}
```

### GET /v1/models

List available models.

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "llama3.2:8b",
      "object": "model",
      "created": 1708300800,
      "owned_by": "solon"
    }
  ]
}
```

## Management API

### GET /api/v1/health

Health check (no auth required).

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

### GET /api/v1/keys

List all API keys.

**Response:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "my-app",
      "prefix": "sol_sk_live_xxxx",
      "scope": "user",
      "rate_limit": 60,
      "created_at": "2024-02-18T12:00:00Z"
    }
  ]
}
```

### POST /api/v1/keys

Create a new API key.

**Request:**
```json
{
  "name": "my-app",
  "scope": "user"
}
```

**Response (201):**
```json
{
  "key": "sol_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "my-app",
  "id": "uuid"
}
```

### DELETE /api/v1/keys/:id

Revoke an API key.

**Response:**
```json
{
  "status": "revoked"
}
```

### POST /api/v1/models/pull

Pull a model from the registry.

**Request:**
```json
{
  "name": "llama3.2:8b"
}
```

### DELETE /api/v1/models/:name

Delete a model.

### GET /api/v1/analytics/requests

Get recent request log.

**Response:**
```json
{
  "requests": [
    {
      "id": 1,
      "key_id": "uuid",
      "method": "POST",
      "path": "/v1/chat/completions",
      "model": "llama3.2:8b",
      "tokens_in": 20,
      "tokens_out": 50,
      "latency_ms": 450,
      "status_code": 200,
      "created_at": "2024-02-18T12:00:00Z"
    }
  ]
}
```

### GET /api/v1/analytics/usage

Get aggregated usage statistics.

**Response:**
```json
{
  "total_requests": 1000,
  "total_tokens_in": 50000,
  "total_tokens_out": 100000,
  "avg_latency_ms": 350.5,
  "requests_today": 42,
  "unique_keys_used": 3,
  "most_used_model": "llama3.2:8b"
}
```

### GET /api/v1/tunnel/status

Get tunnel status.

### POST /api/v1/tunnel/enable

Enable secure tunnel.

### POST /api/v1/tunnel/disable

Disable secure tunnel.

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "description of what went wrong",
    "type": "Unauthorized"
  }
}
```

## Rate Limiting

When rate limited, the API returns `429 Too Many Requests` with a `Retry-After` header.
