import type { TierDefinition, Provider, Region } from "./types";

export const TIERS: Record<string, TierDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 2500, // cents
    provider: "hetzner",
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
    provider: "hetzner",
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
    provider: "hetzner",
    serverType: "gx11",
    description: "Dedicated GPU for local inference with NVIDIA L4",
    features: [
      "8 vCPU / 32 GB RAM",
      "NVIDIA L4 GPU (24 GB)",
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
    gpuModel: "L4",
    gpuVram: 24,
  },
  "gpu-a100": {
    id: "gpu-a100",
    name: "GPU A100",
    price: 119900, // cents — ~$1,199/mo
    provider: "datacrunch",
    serverType: "1A100.10V",
    description: "NVIDIA A100 80GB — run large open-source models locally",
    features: [
      "10 vCPU / 120 GB RAM",
      "NVIDIA A100 80GB SXM4",
      "200 GB NVMe storage",
      "Run Llama 70B, Mixtral, DeepSeek locally",
      "Tenant isolation + WAF",
      "Automatic TLS",
      "Full monitoring suite",
      "Custom model deployment",
    ],
    vcpu: 10,
    ram: 120,
    disk: 200,
    hasGpu: true,
    gpuModel: "A100",
    gpuVram: 80,
  },
  "gpu-h100": {
    id: "gpu-h100",
    name: "GPU H100",
    price: 179900, // cents — ~$1,799/mo
    provider: "datacrunch",
    serverType: "1H100.20V",
    description: "NVIDIA H100 80GB — fastest inference for demanding workloads",
    features: [
      "20 vCPU / 200 GB RAM",
      "NVIDIA H100 80GB SXM5",
      "400 GB NVMe storage",
      "Run any open-source model at peak speed",
      "Tenant isolation + WAF",
      "Automatic TLS",
      "Full monitoring suite",
      "Custom model deployment",
    ],
    vcpu: 20,
    ram: 200,
    disk: 400,
    hasGpu: true,
    gpuModel: "H100",
    gpuVram: 80,
  },
  "gpu-h200": {
    id: "gpu-h200",
    name: "GPU H200",
    price: 249900, // cents — ~$2,499/mo
    provider: "datacrunch",
    serverType: "1H200.20V",
    description: "NVIDIA H200 141GB — maximum VRAM for the largest models",
    features: [
      "20 vCPU / 200 GB RAM",
      "NVIDIA H200 141GB SXM5",
      "400 GB NVMe storage",
      "Run 400B+ parameter models unquantized",
      "Tenant isolation + WAF",
      "Automatic TLS",
      "Full monitoring suite",
      "Custom model deployment",
    ],
    vcpu: 20,
    ram: 200,
    disk: 400,
    hasGpu: true,
    gpuModel: "H200",
    gpuVram: 141,
  },
};

export interface RegionDefinition {
  name: string;
  location: string;
  provider: Provider;
  providerLocation: string;
}

export const REGIONS: Record<Region, RegionDefinition> = {
  "eu-central": {
    name: "EU Central",
    location: "Falkenstein, DE",
    provider: "hetzner",
    providerLocation: "fsn1",
  },
  "eu-west": {
    name: "EU West",
    location: "Helsinki, FI",
    provider: "hetzner",
    providerLocation: "hel1",
  },
  "eu-north": {
    name: "EU North",
    location: "Finland",
    provider: "datacrunch",
    providerLocation: "FIN-01",
  },
  "eu-north-2": {
    name: "EU North 2",
    location: "Iceland",
    provider: "datacrunch",
    providerLocation: "ICE-01",
  },
  "us-east": {
    name: "US East",
    location: "Ashburn, VA",
    provider: "hetzner",
    providerLocation: "ash",
  },
};
