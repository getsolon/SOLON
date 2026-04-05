# NemoClaw Managed Hosting - Hetzner Cloud Firewall Module Variables

variable "name" {
  description = "Name of the firewall"
  type        = string
}

variable "allowed_ssh_ips" {
  description = "List of IP ranges (CIDR) allowed to connect via SSH. If empty, SSH is open to all."
  type        = list(string)
  default     = []
}
