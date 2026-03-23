import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { provisioningJobs } from "@/server/db/schema";
import { processJob } from "./worker";

const POLL_INTERVAL_MS = 5000;
let isProcessing = false;

/**
 * Poll the provisioning_jobs table for pending jobs and process them
 * one at a time in FIFO order.
 */
async function pollForJobs(): Promise<void> {
  if (isProcessing) return;

  try {
    const pendingJob = await db.query.provisioningJobs.findFirst({
      where: eq(provisioningJobs.status, "pending"),
      orderBy: (jobs, { asc }) => [asc(jobs.id)],
    });

    if (!pendingJob) return;

    isProcessing = true;
    console.log(`[queue] Processing job ${pendingJob.id} (${pendingJob.action})`);

    await processJob(pendingJob);
  } catch (error) {
    console.error("[queue] Error polling for jobs:", error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the provisioning job queue. Polls every POLL_INTERVAL_MS.
 */
export function startJobQueue(): void {
  console.log(`[queue] Starting provisioning queue (poll interval: ${POLL_INTERVAL_MS}ms)`);
  setInterval(pollForJobs, POLL_INTERVAL_MS);
}

/**
 * Append a log line to a provisioning job.
 */
export async function appendJobLog(jobId: string, message: string): Promise<void> {
  const job = await db.query.provisioningJobs.findFirst({
    where: eq(provisioningJobs.id, jobId),
  });

  const timestamp = new Date().toISOString();
  const logLine = `${timestamp} ${message}`;
  const existingLogs = job?.logs || "";
  const updatedLogs = existingLogs ? `${existingLogs}\n${logLine}` : logLine;

  await db
    .update(provisioningJobs)
    .set({ logs: updatedLogs })
    .where(eq(provisioningJobs.id, jobId));
}
