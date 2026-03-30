import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TIERS, REGIONS } from "@/lib/constants";
import type { Instance } from "@/server/db/schema";
import type { Region } from "@/lib/types";

// Path to the shared Terraform module for Hetzner instances
const TF_MODULE_DIR =
  process.env.TF_MODULE_DIR || "/var/lib/nemoclaw/terraform/modules/hetzner-instance";

/**
 * Generate terraform.tfvars and a main.tf that references the shared module
 * for the given instance inside the workspace directory.
 */
export async function generateTfvars(
  instance: Instance,
  workspaceDir: string
): Promise<void> {
  await mkdir(workspaceDir, { recursive: true });

  const tier = TIERS[instance.tier];
  const region = REGIONS[instance.region as Region];

  if (!tier || !region) {
    throw new Error(`Invalid tier (${instance.tier}) or region (${instance.region})`);
  }

  // Generate main.tf referencing the shared module
  const mainTf = `
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

provider "hcloud" {
  token = var.hetzner_api_token
}

variable "hetzner_api_token" {
  type      = string
  sensitive = true
}

variable "server_name" {
  type = string
}

variable "server_type" {
  type = string
}

variable "location" {
  type = string
}

variable "ssh_key_name" {
  type    = string
  default = "nemoclaw-provisioner"
}

module "instance" {
  source = "${TF_MODULE_DIR}"

  server_name  = var.server_name
  server_type  = var.server_type
  location     = var.location
  ssh_key_name = var.ssh_key_name
}

output "server_ip" {
  value = module.instance.server_ip
}

output "server_id" {
  value = module.instance.server_id
}
`.trimStart();

  // Generate terraform.tfvars
  const tfvars = `
hetzner_api_token = "${process.env.HETZNER_API_TOKEN}"
server_name       = "solon-${instance.name}"
server_type       = "${tier.serverType}"
location          = "${region.providerLocation}"
`.trimStart();

  await writeFile(path.join(workspaceDir, "main.tf"), mainTf);
  await writeFile(path.join(workspaceDir, "terraform.tfvars"), tfvars);
}

/**
 * Generate an Ansible inventory file for the given instance.
 * Returns the path to the generated inventory file.
 */
export async function generateAnsibleInventory(
  instance: Instance,
  ipv4: string,
  workspaceDir: string
): Promise<string> {
  await mkdir(workspaceDir, { recursive: true });

  const tier = TIERS[instance.tier];
  const inventoryContent = `
[solon]
${ipv4} ansible_user=root ansible_ssh_common_args='-o StrictHostKeyChecking=no'

[solon:vars]
instance_name=${instance.name}
instance_id=${instance.id}
tier=${instance.tier}
has_gpu=${tier?.hasGpu ? "true" : "false"}
`.trimStart();

  const inventoryPath = path.join(workspaceDir, "inventory.ini");
  await writeFile(inventoryPath, inventoryContent);
  return inventoryPath;
}

/**
 * Generate a bash startup script for DataCrunch instances.
 * Replicates the Ansible solon-managed-setup playbook as a single script.
 */
export function generateStartupScript(instance: Instance): string {
  const tier = TIERS[instance.tier];
  const solonVersion = process.env.SOLON_VERSION || "latest";
  const solonPort = 8420;
  const githubRepo = process.env.SOLON_GITHUB_REPO || "solon-project/solon";

  return `#!/bin/bash
set -euo pipefail
exec > /var/log/solon-setup.log 2>&1

echo "=== Solon setup starting at $(date) ==="

# --- System packages ---
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y
apt-get install -y curl ca-certificates ufw fail2ban gnupg lsb-release unattended-upgrades apt-listchanges

# --- Firewall (UFW) ---
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow ${solonPort}/tcp
ufw --force enable

# --- fail2ban ---
cat > /etc/fail2ban/jail.local << 'JAIL'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
maxretry = 3
bantime = 7200
JAIL
systemctl enable fail2ban
systemctl restart fail2ban

# --- SSH hardening ---
sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\\?ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl reload sshd

# --- Automatic security updates ---
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOUPG'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOUPG

# --- Docker (already on DataCrunch CUDA images, ensure daemon config) ---
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKERCFG'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
DOCKERCFG
systemctl restart docker || true

# --- Solon user & directories ---
groupadd -r solon 2>/dev/null || true
useradd -r -g solon -G docker -d /var/lib/solon -s /usr/sbin/nologin solon 2>/dev/null || true
mkdir -p /opt/solon/bin /etc/solon /var/lib/solon/logs
chown -R solon:solon /opt/solon /etc/solon /var/lib/solon

# --- Download Solon binary ---
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  SOLON_ARCH="amd64" ;;
  aarch64) SOLON_ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

if [ "${solonVersion}" = "latest" ]; then
  RELEASE_URL=$(curl -fsSL "https://api.github.com/repos/${githubRepo}/releases/latest" | grep "browser_download_url.*solon-linux-\${SOLON_ARCH}" | cut -d '"' -f 4)
else
  RELEASE_URL="https://github.com/${githubRepo}/releases/download/${solonVersion}/solon-linux-\${SOLON_ARCH}"
fi

curl -fsSL -o /opt/solon/bin/solon "$RELEASE_URL"
chmod 755 /opt/solon/bin/solon

# --- Solon configuration ---
cat > /etc/solon/config.yaml << 'SOLONCFG'
port: ${solonPort}
data_dir: /var/lib/solon
log_dir: /var/lib/solon/logs
managed: true
gpu_enabled: ${tier?.hasGpu ? "true" : "false"}
SOLONCFG
chown solon:solon /etc/solon/config.yaml
chmod 640 /etc/solon/config.yaml

# --- Systemd service ---
cat > /etc/systemd/system/solon.service << 'SVCUNIT'
[Unit]
Description=Solon AI Runtime
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=solon
Group=solon
ExecStart=/opt/solon/bin/solon serve --config /etc/solon/config.yaml
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SVCUNIT

systemctl daemon-reload
systemctl enable solon
systemctl start solon

# --- Wait for Solon to be healthy ---
echo "Waiting for Solon to start..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:${solonPort}/api/v1/health > /dev/null 2>&1; then
    echo "Solon is healthy"
    break
  fi
  sleep 2
done

# --- Generate initial admin key ---
/opt/solon/bin/solon keys create --name managed-admin --scope admin > /etc/solon/initial-key 2>&1
chmod 600 /etc/solon/initial-key

# --- Docker network for sandboxes ---
ufw allow from 172.16.0.0/12 to any port ${solonPort} proto tcp
docker network create solon-bridge 2>/dev/null || true
docker pull node:22-slim

# --- Managed instance marker ---
cat > /etc/solon/managed.yaml << MARKER
provider: datacrunch
instance_id: ${instance.id}
instance_name: ${instance.name}
tier: ${instance.tier}
gpu_model: ${tier?.gpuModel || "none"}
provisioned_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
MARKER

echo "=== Solon setup completed at $(date) ==="
`;
}
