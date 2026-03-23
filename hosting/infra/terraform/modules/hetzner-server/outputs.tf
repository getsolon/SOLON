# NemoClaw Managed Hosting - Hetzner Cloud Server Module Outputs

output "server_id" {
  description = "ID of the provisioned Hetzner Cloud server"
  value       = hcloud_server.this.id
}

output "ipv4_address" {
  description = "Public IPv4 address of the server"
  value       = hcloud_server.this.ipv4_address
}

output "ipv6_address" {
  description = "Public IPv6 network of the server"
  value       = hcloud_server.this.ipv6_address
}

output "status" {
  description = "Current status of the server (e.g. running, off)"
  value       = hcloud_server.this.status
}
