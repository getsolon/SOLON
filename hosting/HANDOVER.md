# NemoClaw Managed Hosting — Handover

## What Was Done (2026-03-20)

### Infrastructure Created
- **Provisioning script**: `hosting/provision-nemoclaw.sh` — one-command server setup on Hetzner
- **Terraform modules**: `hosting/infra/terraform/` — hcloud server + firewall modules, personal + customer-template environments
- **Ansible playbooks**: `hosting/infra/ansible/` — hardening, docker, nemoclaw, gpu-inference roles (note: for NemoClaw, the official NVIDIA installer is better than our custom playbooks)
- **Next.js app skeleton**: `hosting/src/` — full app with auth, tRPC, Drizzle schema, provisioning engine, Stripe billing (builds clean, 0 TS errors)
- **Pricing page**: `website/src/pages/pricing.astro` — product tabs (NemoClaw first), Solon Cloud tiers, FAQ, CTA

### Prototype Server
- **IP**: 178.104.89.38
- **Type**: CX33 (4 vCPU, 8 GB RAM) in Nuremberg (nbg1)
- **SSH**: `ssh -i ~/.ssh/id_ed25519 root@178.104.89.38`
- **Status**: NemoClaw installed, OpenShell gateway running (K3s, healthy)
- **Pending**: Server needs reboot, then `nemoclaw onboard` (interactive) to create first sandbox
- **Delete when done**: `HCLOUD_TOKEN=... hcloud server delete nemoclaw-4563`

### Key Discovery: NemoClaw Architecture
NemoClaw is NOT a simple gateway like OpenClaw. It uses:
- **OpenShell** — NVIDIA's sandbox runtime (runs K3s in Docker)
- **Sandboxes** — isolated environments for each agent
- **Policy presets** — declarative YAML security policies
- **NIM** — NVIDIA Inference Microservices for model serving

Install is: `curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash`
Sandbox creation requires interactive `nemoclaw onboard` (asks for NVIDIA credentials + model).

### What We Learned About Pricing
Hetzner price increase ~33% on April 1, 2026:
| Tier | Price | Post-April Cost | Margin |
|------|-------|-----------------|--------|
| Starter (CX33) | $25/mo | ~$11/mo | 56% |
| Pro (CX43) | $49/mo | ~$22/mo | 55% |
| GPU (GEX44) | $299/mo | ~$269/mo | 10% |

GPU margin is thin. Consider $349/mo.

## Architecture Decision
The Next.js app in `hosting/` was the initial approach but is **being replaced** by extending the existing Solon ecosystem:
- **Cloud API** (`cloud/`) handles auth, billing, instance management
- **Dashboard** (`dashboard/`) gets managed instance UI
- **Provisioner** (small service on CX22) handles Terraform + NemoClaw install
- **Website** (`website/`) has the pricing page

The Next.js code in `hosting/src/` can be referenced for patterns (tRPC procedures, Drizzle schema, provisioning worker) but the actual product integrates into the existing stack.

## Files Changed in This Session

### New files (hosting/)
```
hosting/provision-nemoclaw.sh          # One-command provisioner (USE THIS)
hosting/HANDOVER.md                    # This file
hosting/package.json                   # Next.js app (reference, not primary)
hosting/src/                           # Full Next.js app skeleton
hosting/infra/terraform/               # Hetzner Terraform modules
hosting/infra/ansible/                 # Ansible playbooks and roles
hosting/Caddyfile                      # Reverse proxy config
hosting/.env.example                   # Environment variables
```

### Modified files
```
website/src/pages/pricing.astro        # NEW: Pricing page with product tabs
website/src/components/Navbar.astro    # Added "Pricing" nav link
.gitignore                             # Added hosting/ patterns
```
