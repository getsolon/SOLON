# NemoClaw ↔ Solon: OpenShell Integration Investigation

## Summary

Solon's `/v1/messages` Anthropic pass-through proxy is deployed and working on CX33 (`178.104.89.38`). Direct curl to `localhost:8420/v1/messages` proxies to Anthropic successfully. The remaining blocker is getting OpenShell's sandbox proxy to route traffic through Solon.

## What was built

### `POST /v1/messages` — Anthropic Pass-Through Proxy

**Files changed:** `internal/gateway/gateway.go`, `internal/gateway/auth.go`

A transparent reverse proxy that accepts Anthropic-native API format and forwards to the configured Anthropic provider:

- **`NormalizeAnthropicAuth` middleware** (`auth.go`): Converts `x-api-key: sol_sk_live_...` header to `Authorization: Bearer sol_sk_live_...`, allowing Anthropic-native clients to authenticate with Solon keys.
- **`handleAnthropicMessages` handler** (`gateway.go`): Reads request body, looks up the Anthropic provider's base URL and raw API key from the store, forwards to `{baseURL}/v1/messages` with the real Anthropic key, and streams the response back unchanged.
- **Route**: `POST /v1/messages` with `NormalizeAnthropicAuth → LocalhostOrAuth → RateLimit` middleware chain.

**Verified working:**
```bash
curl http://localhost:8420/v1/messages \
  -H "x-api-key: sol_sk_live_..." \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
# → Anthropic-native JSON response
```

Both `x-api-key` and `Authorization: Bearer` auth work. Streaming SSE pass-through works.

## OpenShell Sandbox Architecture (Discovered)

### Network Jail

The sandbox runs in its own network namespace:
- IP: `10.200.0.2/24`
- Default gateway: `10.200.0.1` (the proxy)
- **All traffic** goes through the HTTP proxy at `10.200.0.1:3128`
- `no_proxy=127.0.0.1,localhost,::1` (but localhost is the sandbox's own loopback, not the host)

### Proxy Process

- Binary: `openshell-sandbox` (PID 1 in the sandbox container)
- Listens: `10.200.0.1:3128`
- Communicates with OpenShell server via gRPC at `openshell.openshell.svc.cluster.local:8080`
- TLS-terminates allowed HTTPS connections (MITM with policy-based cert)

### Policy Enforcement

Network policies are per-endpoint and per-binary:
```yaml
claude_code:
  endpoints:
    - host: api.anthropic.com
      port: 443
      protocol: rest
      tls: terminate      # proxy TLS-terminates
      enforcement: enforce
      access: full
  binaries:
    - path: /usr/local/bin/claude
    - path: /usr/bin/node
```

Only whitelisted binaries can use each policy. `curl` is not in the `claude_code` policy, which is why `curl` from the sandbox always gets 403.

### Credential Resolution

- Sandbox env: `ANTHROPIC_API_KEY=openshell:resolve:env:ANTHROPIC_API_KEY`
- Claude Code sends this placeholder in `x-api-key` header
- Proxy intercepts, contacts OpenShell server via gRPC to resolve the credential
- Server looks up credential from the provider associated with the sandbox
- Resolved credential replaces the placeholder before forwarding upstream

### K8s Topology

- Gateway container: `openshell-cluster-nemoclaw` (Docker)
- K3s node network: `172.18.0.2`, Docker host: `172.18.0.1`
- OpenShell server: `openshell-0` pod in `openshell` namespace
- Sandbox controller: `agent-sandbox-controller-0` in `agent-sandbox-system` namespace
- CoreDNS: configmap `coredns` in `kube-system`, NodeHosts can be patched

## Blockers

### 1. Credential Resolution Fails (Root Cause)

Provider credentials ARE stored in the OpenShell database (confirmed by dumping the protobuf payload from `objects` table), but the proxy's gRPC credential resolution returns nothing.

```
# Database shows the credential:
ANTHROPIC_API_KEY = sol_sk_live_oCB3xQ2_VinofSVWai9mTkf0fbv6

# But CLI shows:
credential_keys: 0
```

The `openshell provider create --credential ANTHROPIC_API_KEY=value` silently stores the value in the protobuf but the server's credential resolution endpoint doesn't find it. This happens for all provider types (`anthropic`, `claude`, `generic`).

### 2. SSRF Protection (Secondary)

When attempting DNS override (`api.anthropic.com → 172.18.0.1`), the proxy blocks connections to private/internal IP ranges:

```
CONNECT blocked: internal address
  dst_host=api.anthropic.com dst_port=443
  reason=api.anthropic.com resolves to internal address 172.18.0.1, connection rejected
```

### 3. TLS Certificate Verification (Secondary)

When using a public IP DNS override (`api.anthropic.com → 178.104.89.38`), the proxy verifies the upstream TLS certificate chain. Self-signed certs fail:

```
TLS L7 relay error host=api.anthropic.com port=443
  error=invalid peer certificate: UnknownIssuer
```

Note: first attempt also failed with `CaUsedAsEndEntity` because `openssl req -x509` creates CA certs by default. Generating a proper CA + end-entity cert fixed that error but hit `UnknownIssuer` since the CA isn't trusted.

## Approaches Tried

| Approach | Result |
|----------|--------|
| `ANTHROPIC_BASE_URL` provider config | Not used by proxy for routing |
| `--credential ANTHROPIC_API_KEY=value` | Stored in DB but resolution fails |
| `--from-existing` with env var | Same — stored but not resolved |
| Custom network policy for `172.18.0.1:8420` (HTTP) | 403 — proxy doesn't support plain HTTP endpoints |
| Custom policy with `tls: terminate` for `172.18.0.1:8420` | 403 — same |
| Custom policy for `172.18.0.1:443` + iptables redirect | SSRF blocked (internal IP) |
| DNS override to `172.18.0.1` via CoreDNS | SSRF blocked (internal IP) |
| DNS override to `178.104.89.38` + socat TLS on 443 | TLS cert verification fails (UnknownIssuer) |
| K8s Service + Endpoints pointing to host | Sandbox can't reach ClusterIP (network jailed) |
| SSH reverse tunnel `-R 8420:localhost:8420` | SSH server doesn't support reverse tunneling |
| Setting `ANTHROPIC_API_KEY=sol_sk_live_...` env override | 403 — proxy blocks non-placeholder API keys |

## Next Steps

1. **Debug credential resolution** — The credential is in the DB but the gRPC `ResolveCredential` endpoint doesn't find it. Needs OpenShell server-side investigation or a newer version.
2. **Alternative: Direct provider integration** — If OpenShell adds support for custom API endpoints in the `anthropic` provider type (respecting `ANTHROPIC_BASE_URL` at the proxy level), this would be the cleanest solution.
3. **Alternative: Trusted TLS cert** — If we can add our self-signed CA to the proxy's trust store, the DNS override approach would work. The CA cert would need to be mounted into the sandbox container.
