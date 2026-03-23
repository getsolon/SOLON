import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface HealthStatus {
  healthy: boolean;
  solonRunning: boolean;
  uptime: string | null;
  version: string | null;
  error: string | null;
}

/**
 * SSH into an instance and run "solon status" to check its health.
 * Parses the response and returns a structured health status.
 */
export async function checkInstanceHealth(
  ipv4: string
): Promise<HealthStatus> {
  try {
    const { stdout } = await execFileAsync(
      "ssh",
      [
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "ConnectTimeout=10",
        "-o",
        "BatchMode=yes",
        `root@${ipv4}`,
        "solon status",
      ],
      { timeout: 30_000 }
    );

    return parseSolonStatus(stdout);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      healthy: false,
      solonRunning: false,
      uptime: null,
      version: null,
      error: message,
    };
  }
}

/**
 * Parse the output of "solon status" into a structured response.
 * Expected format:
 *   status: running
 *   uptime: 3d 12h 5m
 *   version: 0.4.2
 */
function parseSolonStatus(output: string): HealthStatus {
  const lines = output.trim().split("\n");
  const data: Record<string, string> = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();
      data[key] = value;
    }
  }

  const solonRunning = data["status"] === "running";

  return {
    healthy: solonRunning,
    solonRunning,
    uptime: data["uptime"] || null,
    version: data["version"] || null,
    error: null,
  };
}
