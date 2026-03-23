# NemoClaw Managed Hosting - Hetzner Cloud Server Module
#
# Reusable module for provisioning a Hetzner Cloud server
# with SSH key access and firewall rules attached.

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

resource "hcloud_server" "this" {
  name        = var.name
  server_type = var.server_type
  image       = var.image
  location    = var.location
  ssh_keys    = var.ssh_key_ids
  firewall_ids = var.firewall_ids
  labels      = var.labels

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  lifecycle {
    ignore_changes = [
      # Ignore changes to the image after initial creation,
      # since OS reinstalls are a manual operation.
      image,
    ]
  }
}
