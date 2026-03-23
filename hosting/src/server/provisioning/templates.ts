import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TIERS, REGIONS } from "@/lib/constants";
import type { Instance } from "@/server/db/schema";
import type { Region } from "@/lib/types";

// Path to the shared Terraform module for Hetzner instances
const TF_MODULE_DIR =
  process.env.TF_MODULE_DIR || "/var/lib/nemoclaw/terraform/modules/hetzner-instance";

/**
 * Generate terraform.tfvars and a main.tf that references the shared module
 * for the given instance inside the workspace directory.
 */
export async function generateTfvars(
  instance: Instance,
  workspaceDir: string
): Promise<void> {
  await mkdir(workspaceDir, { recursive: true });

  const tier = TIERS[instance.tier];
  const region = REGIONS[instance.region as Region];

  if (!tier || !region) {
    throw new Error(`Invalid tier (${instance.tier}) or region (${instance.region})`);
  }

  // Generate main.tf referencing the shared module
  const mainTf = `
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

provider "hcloud" {
  token = var.hetzner_api_token
}

variable "hetzner_api_token" {
  type      = string
  sensitive = true
}

variable "server_name" {
  type = string
}

variable "server_type" {
  type = string
}

variable "location" {
  type = string
}

variable "ssh_key_name" {
  type    = string
  default = "nemoclaw-provisioner"
}

module "instance" {
  source = "${TF_MODULE_DIR}"

  server_name  = var.server_name
  server_type  = var.server_type
  location     = var.location
  ssh_key_name = var.ssh_key_name
}

output "server_ip" {
  value = module.instance.server_ip
}

output "server_id" {
  value = module.instance.server_id
}
`.trimStart();

  // Generate terraform.tfvars
  const tfvars = `
hetzner_api_token = "${process.env.HETZNER_API_TOKEN}"
server_name       = "nc-${instance.name}"
server_type       = "${tier.serverType}"
location          = "${region.hetznerLocation}"
`.trimStart();

  await writeFile(path.join(workspaceDir, "main.tf"), mainTf);
  await writeFile(path.join(workspaceDir, "terraform.tfvars"), tfvars);
}

/**
 * Generate an Ansible inventory file for the given instance.
 * Returns the path to the generated inventory file.
 */
export async function generateAnsibleInventory(
  instance: Instance,
  ipv4: string,
  workspaceDir: string
): Promise<string> {
  await mkdir(workspaceDir, { recursive: true });

  const tier = TIERS[instance.tier];
  const inventoryContent = `
[solon]
${ipv4} ansible_user=root ansible_ssh_common_args='-o StrictHostKeyChecking=no'

[solon:vars]
instance_name=${instance.name}
instance_id=${instance.id}
tier=${instance.tier}
has_gpu=${tier?.hasGpu ? "true" : "false"}
`.trimStart();

  const inventoryPath = path.join(workspaceDir, "inventory.ini");
  await writeFile(inventoryPath, inventoryContent);
  return inventoryPath;
}
