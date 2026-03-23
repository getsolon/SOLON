# NemoClaw Managed Hosting - Hetzner Cloud Firewall Module
#
# Standard firewall rules for NemoClaw/Solon hosting nodes:
#   - SSH (22)         : Restricted to allowed IPs
#   - NemoClaw/Solon   : Port 8420 (open to all)
#   - HTTP (80)        : Open to all
#   - HTTPS (443)      : Open to all

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

resource "hcloud_firewall" "this" {
  name = var.name

  # SSH - restricted to allowed IPs
  dynamic "rule" {
    for_each = length(var.allowed_ssh_ips) > 0 ? [1] : []
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "22"
      source_ips = var.allowed_ssh_ips
      description = "SSH access (restricted)"
    }
  }

  # SSH - open to all if no IP restrictions are set
  dynamic "rule" {
    for_each = length(var.allowed_ssh_ips) == 0 ? [1] : []
    content {
      direction  = "in"
      protocol   = "tcp"
      port       = "22"
      source_ips = ["0.0.0.0/0", "::/0"]
      description = "SSH access (unrestricted)"
    }
  }

  # NemoClaw / Solon communication port
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "8420"
    source_ips = ["0.0.0.0/0", "::/0"]
    description = "NemoClaw/Solon service port"
  }

  # HTTP
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
    description = "HTTP"
  }

  # HTTPS
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
    description = "HTTPS"
  }
}
