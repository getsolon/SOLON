export type Tier = "starter" | "pro" | "gpu";

export type InstanceStatus =
  | "pending"
  | "provisioning"
  | "running"
  | "stopped"
  | "failed"
  | "deleted";

export type ProvisioningAction = "create" | "delete";

export type ProvisioningJobStatus =
  | "pending"
  | "terraform_running"
  | "ansible_running"
  | "completed"
  | "failed";

export type Region = "eu-central" | "eu-west" | "us-east";

export interface TierDefinition {
  id: Tier;
  name: string;
  price: number;
  serverType: string;
  description: string;
  features: string[];
  vcpu: number;
  ram: number;
  disk: number;
  hasGpu: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}
