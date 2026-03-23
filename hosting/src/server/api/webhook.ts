import { createServer } from "node:http";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { terraformInit, terraformApply, terraformOutput, terraformDestroy } from "../provisioning/terraform";
import { runAnsiblePlaybook } from "../provisioning/ansible";

const PORT = parseInt(process.env.PROVISIONER_PORT || "3100", 10);
const SHARED_SECRET = process.env.PROVISIONER_SECRET || "";
const HETZNER_API_TOKEN = process.env.HETZNER_API_TOKEN || "";
const CALLBACK_URL = process.env.CALLBACK_URL || ""; // Cloud API URL to report status
const CALLBACK_SECRET = process.env.CALLBACK_SECRET || "";

const WORKSPACE_BASE = "/var/lib/solon-managed/workspaces";
const TF_MODULE_DIR = process.env.TF_MODULE_DIR || "/var/lib/solon-managed/terraform/modules/hetzner-instance";
const ANSIBLE_PLAYBOOKS_DIR = process.env.ANSIBLE_PLAYBOOKS_DIR || "/var/lib/solon-managed/ansible/playbooks";

const TIER_SERVER_TYPES: Record<string, string> = {
  starter: "cx22",
  pro: "cx42",
  gpu: "gx11",
};

const REGION_LOCATIONS: Record<string, string> = {
  "eu-central": "nbg1",
  "eu-west": "hel1",
};

interface ProvisionRequest {
  action: "create" | "delete";
  instance_id: string;
  tier?: string;
  region?: string;
  name?: string;
}

// --- HMAC signature verification ---

function verifySignature(payload: string, signature: string): boolean {
  if (!SHARED_SECRET || !signature) return false;

  const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig) return false;

  // 5-minute tolerance
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = createHmac("sha256", SHARED_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
}

// --- Provisioning logic ---

async function handleCreate(req: ProvisionRequest): Promise<void> {
  const { instance_id, tier, region, name } = req;
  if (!tier || !name) throw new Error("Missing tier or name");

  const serverType = TIER_SERVER_TYPES[tier] || "cx22";
  const location = REGION_LOCATIONS[region || "eu-central"] || "nbg1";
  const workspaceDir = path.join(WORKSPACE_BASE, instance_id);

  await mkdir(workspaceDir, { recursive: true });

  // Generate Terraform config
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

module "instance" {
  source = "${TF_MODULE_DIR}"

  server_name  = "solon-${name}"
  server_type  = "${serverType}"
  location     = "${location}"
  ssh_key_name = "solon-provisioner"
}

output "server_ip" {
  value = module.instance.server_ip
}

output "server_id" {
  value = module.instance.server_id
}
`.trimStart();

  const tfvars = `hetzner_api_token = "${HETZNER_API_TOKEN}"\n`;

  await writeFile(path.join(workspaceDir, "main.tf"), mainTf);
  await writeFile(path.join(workspaceDir, "terraform.tfvars"), tfvars);

  console.log(`[provision] Creating server for ${instance_id} (${tier}/${location})...`);

  // Terraform
  await terraformInit(workspaceDir);
  await terraformApply(workspaceDir);

  const output = await terraformOutput(workspaceDir);
  const ipv4 = output.server_ip?.value;
  if (!ipv4) throw new Error("Terraform did not output a server IP");

  console.log(`[provision] Server created: ${ipv4}`);

  // Ansible
  const inventoryPath = path.join(workspaceDir, "inventory.ini");
  await writeFile(
    inventoryPath,
    `[solon]\n${ipv4} ansible_user=root ansible_ssh_common_args='-o StrictHostKeyChecking=no'\n\n[solon:vars]\ninstance_name=${name}\ntier=${tier}\n`,
  );

  console.log(`[provision] Running Ansible...`);
  await runAnsiblePlaybook(
    path.join(ANSIBLE_PLAYBOOKS_DIR, "solon-managed-setup.yml"),
    inventoryPath,
    { instance_name: name, tier },
  );

  // Read the generated API key
  let solonApiKey = "";
  try {
    // The Ansible playbook writes the initial key to a known path on the server
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    const { stdout } = await exec("ssh", [
      "-o", "StrictHostKeyChecking=no",
      "-o", "BatchMode=yes",
      `root@${ipv4}`,
      "cat /etc/solon/initial-key 2>/dev/null || echo ''",
    ], { timeout: 30_000 });
    solonApiKey = stdout.trim();
  } catch {
    console.log("[provision] Could not read initial API key");
  }

  // Report back to Cloud API
  await reportStatus(instance_id, "running", {
    ipv4,
    solon_api_key: solonApiKey,
    dashboard_url: `http://${ipv4}:8420`,
  });

  console.log(`[provision] Instance ${instance_id} is running at ${ipv4}`);
}

async function handleDelete(req: ProvisionRequest): Promise<void> {
  const workspaceDir = path.join(WORKSPACE_BASE, req.instance_id);

  console.log(`[provision] Deleting instance ${req.instance_id}...`);
  await terraformDestroy(workspaceDir);
  await reportStatus(req.instance_id, "deleted", {});

  console.log(`[provision] Instance ${req.instance_id} deleted`);
}

async function reportStatus(
  instanceId: string,
  status: string,
  data: Record<string, string>,
): Promise<void> {
  if (!CALLBACK_URL || !CALLBACK_SECRET) return;

  const payload = JSON.stringify({ instance_id: instanceId, status, ...data });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac("sha256", CALLBACK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  try {
    await fetch(`${CALLBACK_URL}/api/webhooks/provisioner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": `t=${timestamp},v1=${sig}`,
      },
      body: payload,
    });
  } catch (err) {
    console.error("[provision] Failed to report status:", err);
  }
}

// --- HTTP Server ---

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/webhook/provision") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks).toString();

    const signature = req.headers["x-signature"] as string;
    if (!verifySignature(body, signature)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid signature" }));
      return;
    }

    const payload = JSON.parse(body) as ProvisionRequest;

    // Process async — respond immediately
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "accepted", instance_id: payload.instance_id }));

    // Process in background
    try {
      if (payload.action === "create") {
        await handleCreate(payload);
      } else if (payload.action === "delete") {
        await handleDelete(payload);
      }
    } catch (err) {
      console.error(`[provision] Job failed for ${payload.instance_id}:`, err);
      await reportStatus(payload.instance_id, "failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`[provisioner] Listening on port ${PORT}`);
});
