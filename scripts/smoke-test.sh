#!/usr/bin/env bash
#
# End-to-end smoke test for Solon
#
# Usage:
#   ./scripts/smoke-test.sh                 # Build + test
#   ./scripts/smoke-test.sh /path/to/solon  # Test a pre-built binary
#
# Tests: version → serve → health → key create → model list → shutdown

set -euo pipefail

SOLON_BIN="${1:-}"
SOLON_PORT=18421
SOLON_DATA=""
SOLON_PID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; cleanup; exit 1; }
info() { echo -e "${YELLOW}→${NC} $1"; }

cleanup() {
  if [ -n "$SOLON_PID" ] && kill -0 "$SOLON_PID" 2>/dev/null; then
    info "Stopping solon (PID $SOLON_PID)..."
    kill "$SOLON_PID" 2>/dev/null || true
    wait "$SOLON_PID" 2>/dev/null || true
  fi
  if [ -n "$SOLON_DATA" ] && [ -d "$SOLON_DATA" ]; then
    rm -rf "$SOLON_DATA"
  fi
}
trap cleanup EXIT

# --- Step 0: Resolve binary ---
if [ -z "$SOLON_BIN" ]; then
  info "Building solon..."
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  (cd "$REPO_ROOT" && make build 2>&1) || fail "Build failed"
  SOLON_BIN="$REPO_ROOT/bin/solon"
fi

if [ ! -x "$SOLON_BIN" ]; then
  fail "Binary not found or not executable: $SOLON_BIN"
fi

# --- Step 1: Version ---
info "Testing: solon version"
VERSION_OUTPUT=$("$SOLON_BIN" version 2>&1) || fail "solon version exited non-zero"
echo "  $VERSION_OUTPUT"
pass "solon version"

# --- Step 2: Start server with temp data dir ---
SOLON_DATA="$(mktemp -d)"
info "Starting solon serve (port=$SOLON_PORT, data=$SOLON_DATA/.solon)..."

HOME="$SOLON_DATA" "$SOLON_BIN" serve --port "$SOLON_PORT" &
SOLON_PID=$!

# Wait for server to be ready (max 15s)
READY=false
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${SOLON_PORT}/api/v1/health" >/dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 0.5
done

if [ "$READY" != "true" ]; then
  fail "Server did not become ready within 15 seconds"
fi
pass "solon serve started"

# --- Step 3: Health check ---
info "Testing: GET /api/v1/health"
HEALTH=$(curl -sf "http://127.0.0.1:${SOLON_PORT}/api/v1/health")
echo "  $HEALTH"

STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "")
if [ "$STATUS" != "ok" ]; then
  fail "Health check returned status '$STATUS', expected 'ok'"
fi
pass "Health check OK"

# --- Step 4: Create API key (localhost bypass) ---
info "Testing: POST /api/v1/keys"
KEY_RESP=$(curl -sf -X POST "http://127.0.0.1:${SOLON_PORT}/api/v1/keys" \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke-test"}')
echo "  $KEY_RESP"

API_KEY=$(echo "$KEY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('key',''))" 2>/dev/null || echo "")
if [ -z "$API_KEY" ]; then
  fail "Failed to create API key"
fi
pass "API key created"

# --- Step 5: List models (authenticated) ---
info "Testing: GET /v1/models (with API key)"
MODELS_RESP=$(curl -sf "http://127.0.0.1:${SOLON_PORT}/v1/models" \
  -H "Authorization: Bearer $API_KEY")
echo "  $MODELS_RESP"

OBJECT=$(echo "$MODELS_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('object',''))" 2>/dev/null || echo "")
if [ "$OBJECT" != "list" ]; then
  fail "GET /v1/models returned object '$OBJECT', expected 'list'"
fi
pass "Model listing OK"

# --- Step 6: List models via management API ---
info "Testing: GET /api/v1/models (management)"
MGMT_MODELS=$(curl -sf "http://127.0.0.1:${SOLON_PORT}/api/v1/models")
echo "  $MGMT_MODELS"
pass "Management model listing OK"

# --- Step 7: System info ---
info "Testing: GET /api/v1/system"
SYSINFO=$(curl -sf "http://127.0.0.1:${SOLON_PORT}/api/v1/system")
echo "  $SYSINFO"

TOTAL_MEM=$(echo "$SYSINFO" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_memory_mb',0))" 2>/dev/null || echo "0")
if [ "$TOTAL_MEM" -eq 0 ] 2>/dev/null; then
  fail "System info returned 0 memory"
fi
pass "System info OK (${TOTAL_MEM}MB RAM)"

# --- Done ---
echo ""
echo -e "${GREEN}All smoke tests passed.${NC}"
