# NemoClaw Managed Hosting - Hetzner Cloud Firewall Module Outputs

output "firewall_id" {
  description = "ID of the provisioned Hetzner Cloud firewall"
  value       = hcloud_firewall.this.id
}
