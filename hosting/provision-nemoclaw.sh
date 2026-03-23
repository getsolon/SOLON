#!/usr/bin/env bash
set -euo pipefail

# NemoClaw Managed Hosting — Single-Server Provisioner
# Usage: ./provision-nemoclaw.sh [--name NAME] [--type cx33|cx43] [--location fsn1|nbg1|hel1]

# --- Defaults ---
SERVER_NAME="nemoclaw-$(date +%s | tail -c 5)"
SERVER_TYPE="cx33"
LOCATION="fsn1"
SSH_KEY_PATH="$HOME/.ssh/id_ed25519"
SSH_PUB_KEY_PATH="$HOME/.ssh/id_ed25519.pub"

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --name)    SERVER_NAME="$2"; shift 2 ;;
    --type)    SERVER_TYPE="$2"; shift 2 ;;
    --location) LOCATION="$2"; shift 2 ;;
    --ssh-key) SSH_KEY_PATH="$2"; SSH_PUB_KEY_PATH="$2.pub"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# --- Preflight ---
echo "=== NemoClaw Provisioner ==="
echo ""

if ! command -v hcloud &>/dev/null; then
  echo "Installing hcloud CLI..."
  brew install hcloud
fi

if [[ -z "${HCLOUD_TOKEN:-}" ]]; then
  echo "HCLOUD_TOKEN not set."
  echo "Get one at: https://console.hetzner.cloud → Project → Security → API Tokens"
  echo ""
  read -rp "Paste your Hetzner Cloud API token: " HCLOUD_TOKEN
  export HCLOUD_TOKEN
fi

# Validate token
if ! hcloud server list &>/dev/null; then
  echo "ERROR: Invalid HCLOUD_TOKEN"
  exit 1
fi

echo "Token valid."
echo ""
echo "Server:   $SERVER_NAME"
echo "Type:     $SERVER_TYPE"
echo "Location: $LOCATION"
echo ""

# --- Upload SSH key ---
SSH_PUB_KEY=$(cat "$SSH_PUB_KEY_PATH")
SSH_KEY_NAME="nemoclaw-$(whoami)"

if hcloud ssh-key describe "$SSH_KEY_NAME" &>/dev/null; then
  echo "SSH key '$SSH_KEY_NAME' already exists in Hetzner."
else
  echo "Uploading SSH key to Hetzner..."
  hcloud ssh-key create --name "$SSH_KEY_NAME" --public-key "$SSH_PUB_KEY"
fi

# --- Create server ---
echo ""
echo "Creating server..."
hcloud server create \
  --name "$SERVER_NAME" \
  --type "$SERVER_TYPE" \
  --image ubuntu-24.04 \
  --location "$LOCATION" \
  --ssh-key "$SSH_KEY_NAME" \
  --label "product=nemoclaw" \
  --label "managed-by=solon"

SERVER_IP=$(hcloud server ip "$SERVER_NAME")
echo ""
echo "Server created: $SERVER_IP"

# --- Wait for SSH ---
echo ""
echo "Waiting for SSH..."
for i in $(seq 1 30); do
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes \
    -i "$SSH_KEY_PATH" root@"$SERVER_IP" "echo ok" &>/dev/null; then
    echo "SSH ready."
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "ERROR: SSH timeout after 30 attempts"
    exit 1
  fi
  sleep 2
done

# --- Remote setup ---
echo ""
echo "Installing NemoClaw on $SERVER_IP..."
echo "This takes ~10 minutes."
echo ""

ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$SERVER_IP" bash <<'REMOTE_SCRIPT'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo ">>> Updating system..."
apt-get update -qq
apt-get upgrade -y -qq

echo ">>> Installing prerequisites..."
apt-get install -y -qq curl git ca-certificates ufw fail2ban

# --- Firewall ---
echo ">>> Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 18789/tcp comment "OpenClaw Gateway"
ufw --force enable

# --- Fail2ban ---
echo ">>> Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<'F2B'
[sshd]
enabled = true
port = ssh
maxretry = 3
bantime = 7200
F2B
systemctl enable fail2ban
systemctl restart fail2ban

# --- Docker ---
echo ">>> Installing Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# --- Node.js 22 ---
echo ">>> Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y -qq nodejs
npm install -g pnpm

# --- NemoClaw ---
echo ">>> Installing NemoClaw..."
# NemoClaw is early preview — install via the official script
# If the NVIDIA script isn't available yet, fall back to openclaw-ansible
if curl -fsSL --head https://www.nvidia.com/nemoclaw.sh 2>/dev/null | grep -q "200"; then
  curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash
else
  echo ">>> NemoClaw installer not yet available, installing OpenClaw + hardening..."

  # Create openclaw user
  useradd -r -m -s /bin/bash -d /home/openclaw openclaw
  usermod -aG docker openclaw

  # Install OpenClaw
  su - openclaw -c 'npm install -g openclaw'

  # Create data directories
  mkdir -p /home/openclaw/.openclaw/workspace
  chown -R openclaw:openclaw /home/openclaw/.openclaw

  # Generate gateway token
  GATEWAY_TOKEN=$(openssl rand -hex 32)

  # Create OpenClaw config
  cat > /home/openclaw/.openclaw/openclaw.json5 <<OCCONF
{
  // NemoClaw managed instance
  gateway: {
    auth: {
      token: "${GATEWAY_TOKEN}"
    },
    bind: "lan",
    port: 18789
  }
}
OCCONF
  chown openclaw:openclaw /home/openclaw/.openclaw/openclaw.json5

  # Systemd service
  cat > /etc/systemd/system/openclaw.service <<'SVC'
[Unit]
Description=OpenClaw Gateway (NemoClaw Managed)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=openclaw
Group=openclaw
WorkingDirectory=/home/openclaw
ExecStart=/usr/bin/openclaw gateway --bind lan --port 18789
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=HOME=/home/openclaw

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/openclaw

[Install]
WantedBy=multi-user.target
SVC

  systemctl daemon-reload
  systemctl enable openclaw
  systemctl start openclaw

  # Save token for output
  echo "$GATEWAY_TOKEN" > /root/.nemoclaw-token
fi

echo ">>> Setup complete!"
REMOTE_SCRIPT

echo ""
echo "=== Retrieving connection info ==="
echo ""

# Get gateway token
GATEWAY_TOKEN=$(ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$SERVER_IP" \
  "cat /root/.nemoclaw-token 2>/dev/null || echo 'check-nemoclaw-config'")

# Check if service is running
SERVICE_STATUS=$(ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" root@"$SERVER_IP" \
  "systemctl is-active openclaw 2>/dev/null || echo 'unknown'")

# --- Output ---
echo "==========================================="
echo "  NemoClaw Instance Ready"
echo "==========================================="
echo ""
echo "  Server:    $SERVER_NAME"
echo "  IP:        $SERVER_IP"
echo "  Type:      $SERVER_TYPE"
echo "  Location:  $LOCATION"
echo "  Status:    $SERVICE_STATUS"
echo ""
echo "  Gateway Token:"
echo "  $GATEWAY_TOKEN"
echo ""
echo "  --- Connect ---"
echo ""
echo "  SSH:"
echo "    ssh -i $SSH_KEY_PATH root@$SERVER_IP"
echo ""
echo "  Gateway UI (via SSH tunnel):"
echo "    ssh -N -L 18789:127.0.0.1:18789 -i $SSH_KEY_PATH root@$SERVER_IP"
echo "    Then open: http://127.0.0.1:18789"
echo ""
echo "  Gateway UI (direct — token required):"
echo "    http://$SERVER_IP:18789"
echo ""
echo "  --- Manage ---"
echo ""
echo "  Logs:      ssh -i $SSH_KEY_PATH root@$SERVER_IP journalctl -u openclaw -f"
echo "  Restart:   ssh -i $SSH_KEY_PATH root@$SERVER_IP systemctl restart openclaw"
echo "  Status:    ssh -i $SSH_KEY_PATH root@$SERVER_IP systemctl status openclaw"
echo ""
echo "  --- Costs ---"
echo ""
echo "  Hetzner:   ~\$${SERVER_TYPE/cx33/8}/mo (billed hourly)"
echo "  Delete:    hcloud server delete $SERVER_NAME"
echo ""
echo "==========================================="

# Save instance info
cat > "/tmp/nemoclaw-${SERVER_NAME}.json" <<EOF
{
  "name": "$SERVER_NAME",
  "ip": "$SERVER_IP",
  "type": "$SERVER_TYPE",
  "location": "$LOCATION",
  "gateway_token": "$GATEWAY_TOKEN",
  "ssh_key": "$SSH_KEY_PATH",
  "status": "$SERVICE_STATUS",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "Instance info saved to /tmp/nemoclaw-${SERVER_NAME}.json"
