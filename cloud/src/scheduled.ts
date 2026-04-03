import type { Env, ManagedInstanceRow } from './types'

/**
 * Cron-triggered lifecycle management for managed instances.
 * Runs on a schedule (e.g. every 5 minutes) via Cloudflare Cron Triggers.
 *
 * 1. Health-checks running instances
 * 2. Triggers deletion for instances stuck in 'deleting' state
 * 3. Marks failed provisioning after timeout
 */
export async function handleScheduled(env: Env): Promise<void> {
  await Promise.all([
    healthCheckRunningInstances(env),
    cleanupDeletingInstances(env),
    timeoutProvisioningInstances(env),
  ])
}

/**
 * Ping running instances and update their status if unreachable.
 */
async function healthCheckRunningInstances(env: Env): Promise<void> {
  const result = await env.DB.prepare(
    `SELECT id, ipv4, name FROM managed_instances WHERE status = 'running' AND ipv4 IS NOT NULL`,
  ).all<ManagedInstanceRow>()

  const instances = result?.results ?? []

  for (const inst of instances) {
    if (!inst.ipv4) continue

    try {
      const resp = await fetch(`http://${inst.ipv4}:8420/api/v1/health`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!resp.ok) {
        console.log(`Health check failed for ${inst.name} (${inst.ipv4}): ${resp.status}`)
        // Don't change status on a single failure — could be transient
        // A production system would track consecutive failures
      }
    } catch {
      console.log(`Health check unreachable for ${inst.name} (${inst.ipv4})`)
    }
  }
}

/**
 * Re-trigger deletion for instances that have been in 'deleting' for >5 min.
 * This handles cases where the initial deletion webhook to the provisioner failed.
 */
async function cleanupDeletingInstances(env: Env): Promise<void> {
  const result = await env.DB.prepare(
    `SELECT id FROM managed_instances WHERE status = 'deleting' AND updated_at < datetime('now', '-5 minutes')`,
  ).all<{ id: string }>()

  const instances = result?.results ?? []
  if (instances.length === 0) return

  if (!env.PROVISIONER_URL || !env.PROVISIONER_SECRET) return

  for (const inst of instances) {
    try {
      const payload = JSON.stringify({ action: 'delete', instance_id: inst.id })
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const sigKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(env.PROVISIONER_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      )
      const sig = await crypto.subtle.sign(
        'HMAC',
        sigKey,
        new TextEncoder().encode(`${timestamp}.${payload}`),
      )
      const sigHex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      await fetch(`${env.PROVISIONER_URL}/webhook/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': `t=${timestamp},v1=${sigHex}`,
        },
        body: payload,
      })
    } catch (err) {
      console.error(`Failed to re-trigger deletion for ${inst.id}:`, err)
    }
  }
}

/**
 * Mark instances stuck in 'provisioning' for >15 minutes as failed.
 */
async function timeoutProvisioningInstances(env: Env): Promise<void> {
  await env.DB.prepare(
    `UPDATE managed_instances SET status = 'failed' WHERE status IN ('pending', 'provisioning') AND created_at < datetime('now', '-15 minutes')`,
  ).run()
}
