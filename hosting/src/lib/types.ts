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

// API response types (from cloud API)

export interface Instance {
  id: string;
  name: string;
  url: string;
  status: string;
  version: string | null;
  models_count: number;
  added_at: string;
}

export interface ManagedInstance {
  id: string;
  name: string;
  tier: string;
  status: string;
  ipv4: string | null;
  region: string;
  dashboard_url: string | null;
  created_at: string;
  ready_at: string | null;
}

export interface BillingInfo {
  plan: string;
  status: string;
  current_period_end: string | null;
  usage: {
    instances: { used: number; limit: number };
    requests: { used: number; limit: number };
    team_members: { used: number; limit: number };
  };
  managed_instances: ManagedInstance[];
  payment_method: unknown;
}
