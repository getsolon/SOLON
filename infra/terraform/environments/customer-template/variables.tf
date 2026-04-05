# NemoClaw Managed Hosting - Customer Template Variables

variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "customer_id" {
  description = "Unique identifier for the customer (used in resource names and labels)"
  type        = string
}

variable "server_type" {
  description = "Hetzner Cloud server type for this customer"
  type        = string
  default     = "cx33"

  validation {
    condition     = contains(["cx11", "cx22", "cx33", "cx43", "cx52", "cax11", "cax21", "cax31"], var.server_type)
    error_message = "Server type must be a valid Hetzner Cloud type (cx33, cx43, etc.)."
  }
}

variable "region" {
  description = "Hetzner datacenter location (fsn1 = Falkenstein, nbg1 = Nuremberg, hel1 = Helsinki, ash = Ashburn)"
  type        = string
  default     = "fsn1"
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}
