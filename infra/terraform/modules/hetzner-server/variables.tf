# NemoClaw Managed Hosting - Hetzner Cloud Server Module Variables

variable "name" {
  description = "Name of the server"
  type        = string
}

variable "server_type" {
  description = "Hetzner Cloud server type (e.g. cx33, cx43, cax21)"
  type        = string
}

variable "image" {
  description = "OS image to use for the server"
  type        = string
  default     = "ubuntu-24.04"
}

variable "location" {
  description = "Hetzner datacenter location (e.g. fsn1, nbg1, hel1, ash)"
  type        = string
  default     = "fsn1"
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs to attach to the server"
  type        = list(string)
  default     = []
}

variable "firewall_ids" {
  description = "List of firewall IDs to attach to the server"
  type        = list(number)
  default     = []
}

variable "labels" {
  description = "Labels to apply to the server for organization and filtering"
  type        = map(string)
  default     = {}
}
