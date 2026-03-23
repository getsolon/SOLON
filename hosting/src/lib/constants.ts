import type { TierDefinition, Region } from "./types";

export const TIERS: Record<string, TierDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 2500, // cents
    serverType: "cx22",
    description: "Development and small workloads",
    features: [
      "2 vCPU / 4 GB RAM",
      "40 GB NVMe storage",
      "Solon inference server",
      "Tenant isolation",
      "Automatic TLS",
      "Basic monitoring",
    ],
    vcpu: 2,
    ram: 4,
    disk: 40,
    hasGpu: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 4900, // cents
    serverType: "cx42",
    description: "Production workloads with higher throughput",
    features: [
      "4 vCPU / 16 GB RAM",
      "80 GB NVMe storage",
      "Solon inference server",
      "Tenant isolation + WAF",
      "Automatic TLS",
      "Priority monitoring",
      "Multi-model routing",
      "Request logging",
    ],
    vcpu: 4,
    ram: 16,
    disk: 80,
    hasGpu: false,
  },
  gpu: {
    id: "gpu",
    name: "GPU",
    price: 29900, // cents
    serverType: "gx11",
    description: "Dedicated GPU for local inference with NVIDIA hardware",
    features: [
      "8 vCPU / 32 GB RAM",
      "NVIDIA L4 GPU",
      "160 GB NVMe storage",
      "Local + cloud inference",
      "Tenant isolation + WAF",
      "Automatic TLS",
      "Full monitoring suite",
      "Custom model deployment",
    ],
    vcpu: 8,
    ram: 32,
    disk: 160,
    hasGpu: true,
  },
};

export const REGIONS: Record<Region, { name: string; location: string; hetznerLocation: string }> = {
  "eu-central": {
    name: "EU Central",
    location: "Falkenstein, DE",
    hetznerLocation: "fsn1",
  },
  "eu-west": {
    name: "EU West",
    location: "Helsinki, FI",
    hetznerLocation: "hel1",
  },
  "us-east": {
    name: "US East",
    location: "Ashburn, VA",
    hetznerLocation: "ash",
  },
};
