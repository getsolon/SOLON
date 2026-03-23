import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { instances, provisioningJobs, type ProvisioningJob } from "@/server/db/schema";
import { appendJobLog } from "./queue";
import { terraformInit, terraformApply, terraformOutput, terraformDestroy } from "./terraform";
import { runAnsiblePlaybook } from "./ansible";
import { generateTfvars, generateAnsibleInventory } from "./templates";

/**
 * Process a single provisioning job through its lifecycle:
 *   pending -> terraform_running -> ansible_running -> completed
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

    // Mark instance as failed for create jobs
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
  const workspaceDir = `/var/lib/nemoclaw/workspaces/${instance.id}`;

  // Phase 1: Terraform
  await db
    .update(provisioningJobs)
    .set({ status: "terraform_running" })
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
  const hetznerServerId = output.server_id?.value;

  if (!ipv4) {
    throw new Error("Terraform did not output a server IP");
  }

  await appendJobLog(job.id, `Server provisioned: ${ipv4} (id: ${hetznerServerId})`);

  // Update instance with server details
  await db
    .update(instances)
    .set({ ipv4, hetznerServerId: String(hetznerServerId) })
    .where(eq(instances.id, instance.id));

  // Phase 2: Ansible
  await db
    .update(provisioningJobs)
    .set({ status: "ansible_running" })
    .where(eq(provisioningJobs.id, job.id));

  await appendJobLog(job.id, "Generating Ansible inventory...");
  const inventoryPath = await generateAnsibleInventory(instance, ipv4, workspaceDir);

  await appendJobLog(job.id, "Running Ansible playbook: solon-setup.yml...");
  await runAnsiblePlaybook("solon-setup.yml", inventoryPath, {
    instance_name: instance.name,
    tier: instance.tier,
  });

  await appendJobLog(job.id, "Provisioning completed successfully");

  // Mark as completed
  await db
    .update(provisioningJobs)
    .set({ status: "completed", completedAt: new Date().toISOString() })
    .where(eq(provisioningJobs.id, job.id));

  await db
    .update(instances)
    .set({ status: "running" })
    .where(eq(instances.id, instance.id));
}

async function processDeleteJob(
  job: ProvisioningJob,
  instance: typeof instances.$inferSelect
): Promise<void> {
  const workspaceDir = `/var/lib/nemoclaw/workspaces/${instance.id}`;

  // Phase 1: Terraform destroy
  await db
    .update(provisioningJobs)
    .set({ status: "terraform_running" })
    .where(eq(provisioningJobs.id, job.id));

  await appendJobLog(job.id, "Running terraform destroy...");
  await terraformDestroy(workspaceDir);
  await appendJobLog(job.id, "Server destroyed");

  // Mark as completed
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
