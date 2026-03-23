# NemoClaw Managed Hosting - Personal Environment (GEX44 Dedicated Server)
#
# IMPORTANT: The GEX44 is a Hetzner *dedicated* server, managed through the
# Hetzner Robot API (https://robot-ws.your-server.de), NOT the Hetzner Cloud API.
# The hcloud provider below cannot provision or manage dedicated servers directly.
#
# This configuration manages the Cloud-side resources (SSH keys, firewalls) and
# serves as the reference setup for our own infrastructure. The dedicated server
# itself must be ordered and configured via the Hetzner Robot panel or API.
#
# For Cloud VMs alongside the dedicated server, use the hcloud_server module below.

terraform {
  required_version = ">= 1.5"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

# ------------------------------------------------------------------
# Provider
# ------------------------------------------------------------------

provider "hcloud" {
  token = var.hcloud_token
}

# ------------------------------------------------------------------
# Variables
# ------------------------------------------------------------------

variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

# ------------------------------------------------------------------
# SSH Key
# ------------------------------------------------------------------

resource "hcloud_ssh_key" "nemoclaw" {
  name       = "nemoclaw-personal"
  public_key = var.ssh_public_key
}

# ------------------------------------------------------------------
# Firewall
# ------------------------------------------------------------------

module "firewall" {
  source = "../../modules/hetzner-firewall"

  name            = "nemoclaw-personal-fw"
  allowed_ssh_ips = [] # Restrict in production, e.g. ["203.0.113.0/24"]
}

# ------------------------------------------------------------------
# Cloud VM (optional companion to the GEX44 dedicated server)
# ------------------------------------------------------------------
# Uncomment the block below if you want a Cloud VM alongside the
# dedicated server (e.g. for monitoring, jump host, etc.)
#
# module "personal_cloud_vm" {
#   source = "../../modules/hetzner-server"
#
#   name        = "nemoclaw-personal-cloud"
#   server_type = "cx33"
#   image       = "ubuntu-24.04"
#   location    = "fsn1"
#   ssh_key_ids  = [hcloud_ssh_key.nemoclaw.id]
#   firewall_ids = [module.firewall.firewall_id]
#
#   labels = {
#     environment = "personal"
#     managed_by  = "nemoclaw"
#     role        = "companion"
#   }
# }

# ------------------------------------------------------------------
# Outputs
# ------------------------------------------------------------------

output "ssh_key_id" {
  description = "Hetzner Cloud SSH key ID"
  value       = hcloud_ssh_key.nemoclaw.id
}

output "firewall_id" {
  description = "Hetzner Cloud firewall ID"
  value       = module.firewall.firewall_id
}
