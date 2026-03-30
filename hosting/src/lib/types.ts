export type Tier = "starter" | "pro" | "gpu" | "gpu-a100" | "gpu-h100" | "gpu-h200";

export type Provider = "hetzner" | "datacrunch";

export type InstanceStatus =
  | "pending"
  | "provisioning"
  | "configuring"
  | "running"
  | "stopped"
  | "failed"
  | "deleted";

export type ProvisioningAction = "create" | "delete";

export type ProvisioningJobStatus =
  | "pending"
  | "creating_server"
  | "configuring_server"
  | "completed"
  | "failed";

export type Region = "eu-central" | "eu-west" | "eu-north" | "eu-north-2" | "us-east";

export type BillingModel = "monthly" | "hourly";

export interface TierDefinition {
  id: Tier;
  name: string;
  /** Price in cents. For monthly tiers: per month. For hourly tiers: per hour. */
  price: number;
  billing: BillingModel;
  provider: Provider;
  serverType: string;
  description: string;
  features: string[];
  vcpu: number;
  ram: number;
  disk: number;
  hasGpu: boolean;
  gpuModel?: string;
  gpuVram?: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}
