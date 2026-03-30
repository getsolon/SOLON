import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { instances, provisioningJobs, type ProvisioningJob } from "@/server/db/schema";
import { TIERS, REGIONS } from "@/lib/constants";
import { appendJobLog } from "./queue";
import { terraformInit, terraformApply, terraformOutput, terraformDestroy } from "./terraform";
import { runAnsiblePlaybook } from "./ansible";
import { generateTfvars, generateAnsibleInventory, generateStartupScript } from "./templates";
import {
  ensureSSHKey,
  createStartupScript,
  deleteStartupScript,
  createInstance as dcCreateInstance,
  deleteInstance as dcDeleteInstance,
  waitForStatus as dcWaitForStatus,
} from "./datacrunch";

/**
 * Process a single provisioning job through its lifecycle:
 *   pending -> creating_server -> configuring_server -> completed
 * On failure at any stage, the job transitions to "failed".
 */
export async function processJob(job: ProvisioningJob): Promise<void> {
  const startedAt = new Date().toISOString();

  await db
    .update(provisioningJobs)
    .set({ startedAt })
    .where(eq(provisioningJobs.id, job.id));

  const instance = await db.query.instances.findFirst({
    where: eq(instances.id, job.instanceId),
  });

  if (!instance) {
    await failJob(job.id, "Instance record not found");
    return;
  }

  try {
    if (job.action === "create") {
      await processCreateJob(job, instance);
    } else if (job.action === "delete") {
      await processDeleteJob(job, instance);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failJob(job.id, message);

    if (job.action === "create") {
      await db
        .update(instances)
        .set({ status: "failed" })
        .where(eq(instances.id, job.instanceId));
    }
  }
}

async function processCreateJob(
  job: ProvisioningJob,
  instance: typeof instances.$inferSelect
): Promise<void> {
  const tier = TIERS[instance.tier];
  if (!tier) throw new Error(`Unknown tier: ${instance.tier}`);

  if (tier.provider === "datacrunch") {
    await createDataCrunchInstance(job, instance);
  } else {
    await createHetznerInstance(job, instance);
  }
}

async function processDeleteJob(
  job: ProvisioningJob,
  instance: typeof instances.$inferSelect
): Promise<void> {
  const tier = TIERS[instance.tier];
  if (!tier) throw new Error(`Unknown tier: ${instance.tier}`);

  if (tier.provider === "datacrunch") {
    await deleteDataCrunchInstance(job, instance);
  } else {
    await deleteHetznerInstance(job, instance);
  }
}

// --- Hetzner (Terraform + Ansible) ---

async function createHetznerInstance(
  job: ProvisioningJob,
  instance: typeof instances.$inferSelect
): Promise<void> {
  const workspaceDir = `/var/lib/solon/workspaces/${instance.id}`;

  await db
    .update(provisioningJobs)
    .set({ status: "creating_server" })
    .where(eq(provisioningJobs.id, job.id));

  await db
    .update(instances)
    .set({ status: "provisioning" })
    .where(eq(instances.id, instance.id));

  await appendJobLog(job.id, "Generating Terraform configuration...");
  await generateTfvars(instance, workspaceDir);

  await appendJobLog(job.id, "Running terraform init...");
  await terraformInit(workspaceDir);

  await appendJobLog(job.id, "Running terraform apply...");
  await terraformApply(workspaceDir);

  const output = await terraformOutput(workspaceDir);
  const ipv4 = output.server_ip?.value;
  const providerServerId = output.server_id?.value;

  if (!ipv4) {
    throw new Error("Terraform did not output a server IP");
  }

  await appendJobLog(job.id, `Server provisioned: ${ipv4} (id: ${providerServerId})`);

  await db
    .update(instances)
    .set({ ipv4, providerServerId: String(providerServerId), status: "configuring" })
    .where(eq(instances.id, instance.id));

  // Phase 2: Ansible
  await db
    .update(provisioningJobs)
    .set({ status: "configuring_server" })
    .where(eq(provisioningJobs.id, job.id));

  await appendJobLog(job.id, "Generating Ansible inventory...");
  const inventoryPath = await generateAnsibleInventory(instance, ipv4, workspaceDir);

  await appendJobLog(job.id, "Running Ansible playbook: solon-setup.yml...");
  await runAnsiblePlaybook("solon-setup.yml", inventoryPath, {
    instance_name: instance.name,
    tier: instance.tier,
  });

  await appendJobLog(job.id, "Provisioning completed successfully");

  await db
    .update(provisioningJobs)
    .set({ status: "completed", completedAt: new Date().toISOString() })
    .where(eq(provisioningJobs.id, job.id));

  await db
    .update(instances)
    .set({ status: "running" })
    .where(eq(instances.id, instance.id));
}

async function deleteHetznerInstance(
  job: ProvisioningJob,
  instance: typeof instances.$inferSelect
): Promise<void> {
  const workspaceDir = `/var/lib/solon/workspaces/${instance.id}`;

  await db
    .update(provisioningJobs)
    .set({ status: "creating_server" })
    .where(eq(provisioningJobs.id, job.id));

  await appendJobLog(job.id, "Running terraform destroy...");
  await terraformDestroy(workspaceDir);
  await appendJobLog(job.id, "Server destroyed");

  await db
    .update(provisioningJobs)
    .set({ status: "completed", completedAt: new Date().toISOString() })
    .where(eq(provisioningJobs.id, job.id));

  await appendJobLog(job.id, "Delete job completed");
}

// --- DataCrunch (REST API + startup script) ---

async function createDataCrunchInstance(
  job: ProvisioningJob,
  instance: typeof instances.$inferSelect
): Promise<void> {
  const tier = TIERS[instance.tier];
  const region = REGIONS[instance.region as keyof typeof REGIONS];

  if (!tier || !region) {
    throw new Error(`Invalid tier (${instance.tier}) or region (${instance.region})`);
  }

  await db
    .update(provisioningJobs)
    .set({ status: "creating_server" })
    .where(eq(provisioningJobs.id, job.id));

  await db
    .update(instances)
    .set({ status: "provisioning" })
    .where(eq(instances.id, instance.id));

  // Ensure SSH key exists on DataCrunch
  await appendJobLog(job.id, "Ensuring SSH key on DataCrunch...");
  const sshPubKey = process.env.PROVISIONER_SSH_PUBLIC_KEY;
  if (!sshPubKey) {
    throw new Error("PROVISIONER_SSH_PUBLIC_KEY must be set for DataCrunch provisioning");
  }
  const sshKeyId = await ensureSSHKey("solon-provisioner", sshPubKey);

  // Create startup script that bootstraps Solon
  await appendJobLog(job.id, "Creating startup script...");
  const scriptContent = generateStartupScript(instance);
  const script = await createStartupScript(
    `solon-setup-${instance.id}`,
    scriptContent
  );

  // Create the GPU instance
  await appendJobLog(job.id, `Creating ${tier.gpuModel} instance in ${region.location}...`);
  const dcInstance = await dcCreateInstance({
    instanceType: tier.serverType,
    hostname: `solon-${instance.name}`,
    locationCode: region.providerLocation,
    sshKeyIds: [sshKeyId],
    startupScriptId: script.id,
    diskSize: tier.disk,
  });

  await appendJobLog(job.id, `Instance created: ${dcInstance.id}, waiting for boot...`);

  await db
    .update(instances)
    .set({
      providerServerId: dcInstance.id,
      status: "configuring",
    })
    .where(eq(instances.id, instance.id));

  await db
    .update(provisioningJobs)
    .set({ status: "configuring_server" })
    .where(eq(provisioningJobs.id, job.id));

  // Wait for the instance to be running (startup script runs automatically)
  const readyInstance = await dcWaitForStatus(dcInstance.id, "running", 600_000);

  await appendJobLog(job.id, `Instance running at ${readyInstance.ip}`);

  // Clean up the one-time startup script
  await deleteStartupScript(script.id).catch(() => {});

  await db
    .update(instances)
    .set({ ipv4: readyInstance.ip, status: "running" })
    .where(eq(instances.id, instance.id));

  await db
    .update(provisioningJobs)
    .set({ status: "completed", completedAt: new Date().toISOString() })
    .where(eq(provisioningJobs.id, job.id));

  await appendJobLog(job.id, "Provisioning completed successfully");
}

async function deleteDataCrunchInstance(
  job: ProvisioningJob,
  instance: typeof instances.$inferSelect
): Promise<void> {
  await db
    .update(provisioningJobs)
    .set({ status: "creating_server" })
    .where(eq(provisioningJobs.id, job.id));

  if (instance.providerServerId) {
    await appendJobLog(job.id, `Deleting DataCrunch instance ${instance.providerServerId}...`);
    await dcDeleteInstance(instance.providerServerId);
    await appendJobLog(job.id, "Instance deleted");
  } else {
    await appendJobLog(job.id, "No provider server ID found, skipping delete");
  }

  await db
    .update(provisioningJobs)
    .set({ status: "completed", completedAt: new Date().toISOString() })
    .where(eq(provisioningJobs.id, job.id));

  await appendJobLog(job.id, "Delete job completed");
}

async function failJob(jobId: string, reason: string): Promise<void> {
  console.error(`[worker] Job ${jobId} failed: ${reason}`);
  await appendJobLog(jobId, `FAILED: ${reason}`);

  await db
    .update(provisioningJobs)
    .set({
      status: "failed",
      completedAt: new Date().toISOString(),
    })
    .where(eq(provisioningJobs.id, jobId));
}
