# NemoClaw Managed Hosting - Customer Template Outputs

output "server_id" {
  description = "Hetzner Cloud server ID"
  value       = module.server.server_id
}

output "ipv4" {
  description = "Public IPv4 address of the customer server"
  value       = module.server.ipv4_address
}

output "ipv6" {
  description = "Public IPv6 network of the customer server"
  value       = module.server.ipv6_address
}
