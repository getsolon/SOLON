# NemoClaw Managed Hosting - Customer Environment Template
#
# Clone this directory for each new customer and fill in their variables.
# Typical usage:
#   cp -r customer-template customer-<id>
#   cd customer-<id>
#   # Edit terraform.tfvars with customer-specific values
#   terraform init && terraform plan

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
# SSH Key
# ------------------------------------------------------------------

resource "hcloud_ssh_key" "customer" {
  name       = "nemoclaw-${var.customer_id}"
  public_key = var.ssh_public_key
}

# ------------------------------------------------------------------
# Firewall
# ------------------------------------------------------------------

module "firewall" {
  source = "../../modules/hetzner-firewall"

  name            = "nemoclaw-${var.customer_id}-fw"
  allowed_ssh_ips = [] # Populated per-customer if IP restriction is desired
}

# ------------------------------------------------------------------
# Server
# ------------------------------------------------------------------

module "server" {
  source = "../../modules/hetzner-server"

  name        = "nemoclaw-${var.customer_id}"
  server_type = var.server_type
  image       = "ubuntu-24.04"
  location    = var.region
  ssh_key_ids  = [hcloud_ssh_key.customer.id]
  firewall_ids = [module.firewall.firewall_id]

  labels = {
    customer    = var.customer_id
    environment = "production"
    managed_by  = "nemoclaw"
  }
}
