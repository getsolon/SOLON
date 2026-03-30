/**
 * DataCrunch (Verda) API client for GPU instance provisioning.
 *
 * API: https://api.datacrunch.io/v1
 * Auth: OAuth2 client credentials
 * Locations: FIN-01 (Finland), ICE-01 (Iceland)
 */

const API_BASE = "https://api.datacrunch.io/v1";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface DataCrunchInstance {
  id: string;
  hostname: string;
  ip: string;
  status: string;
  instance_type: string;
  image: string;
  location: string;
  created_at: string;
}

interface DataCrunchSSHKey {
  id: string;
  name: string;
  public_key: string;
}

interface DataCrunchScript {
  id: string;
  name: string;
  script: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.DATACRUNCH_CLIENT_ID;
  const clientSecret = process.env.DATACRUNCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("DATACRUNCH_CLIENT_ID and DATACRUNCH_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const { clientId, clientSecret } = getCredentials();

  const res = await fetch(`${API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DataCrunch auth failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as TokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataCrunch API ${method} ${path} failed (${res.status}): ${text}`);
  }

  // DELETE returns 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// --- SSH Keys ---

export async function listSSHKeys(): Promise<DataCrunchSSHKey[]> {
  return apiRequest<DataCrunchSSHKey[]>("GET", "/sshkeys");
}

export async function createSSHKey(name: string, publicKey: string): Promise<DataCrunchSSHKey> {
  return apiRequest<DataCrunchSSHKey>("POST", "/sshkeys", {
    name,
    public_key: publicKey,
  });
}

/**
 * Get or create an SSH key by name. Avoids duplicates on re-provisioning.
 */
export async function ensureSSHKey(name: string, publicKey: string): Promise<string> {
  const keys = await listSSHKeys();
  const existing = keys.find((k) => k.name === name);
  if (existing) return existing.id;

  const created = await createSSHKey(name, publicKey);
  return created.id;
}

// --- Startup Scripts ---

export async function createStartupScript(
  name: string,
  script: string
): Promise<DataCrunchScript> {
  return apiRequest<DataCrunchScript>("POST", "/scripts", { name, script });
}

export async function deleteStartupScript(id: string): Promise<void> {
  return apiRequest<void>("DELETE", `/scripts/${id}`);
}

// --- Instances ---

export async function checkAvailability(
  instanceType: string,
  locationCode: string
): Promise<boolean> {
  const available = await apiRequest<string[]>(
    "GET",
    `/instance-availability/${instanceType}?location_code=${locationCode}`
  );
  return available.length > 0;
}

export interface CreateInstanceParams {
  instanceType: string;
  hostname: string;
  locationCode: string;
  sshKeyIds: string[];
  startupScriptId?: string;
  diskSize?: number;
}

export async function createInstance(
  params: CreateInstanceParams
): Promise<DataCrunchInstance> {
  const body: Record<string, unknown> = {
    instance_type: params.instanceType,
    image: "ubuntu-24.04-cuda-12.8-open-docker",
    hostname: params.hostname,
    location_code: params.locationCode,
    ssh_key_ids: params.sshKeyIds,
    is_spot: false,
    contract: "PAY_AS_YOU_GO",
    pricing: "DYNAMIC_PRICE",
  };

  if (params.startupScriptId) {
    body.startup_script_id = params.startupScriptId;
  }

  if (params.diskSize) {
    body.os_volume = { name: `${params.hostname}-os`, size: params.diskSize };
  }

  return apiRequest<DataCrunchInstance>("POST", "/instances", body);
}

export async function getInstance(id: string): Promise<DataCrunchInstance> {
  return apiRequest<DataCrunchInstance>("GET", `/instances/${id}`);
}

export async function deleteInstance(id: string): Promise<void> {
  return apiRequest<void>("PUT", "/instances", {
    id: [id],
    action: "delete",
  });
}

export async function shutdownInstance(id: string): Promise<void> {
  return apiRequest<void>("PUT", "/instances", {
    id: [id],
    action: "shutdown",
  });
}

/**
 * Poll until the instance reaches the target status or a timeout.
 */
export async function waitForStatus(
  id: string,
  targetStatus: string,
  timeoutMs = 300_000,
  pollIntervalMs = 10_000
): Promise<DataCrunchInstance> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const instance = await getInstance(id);
    if (instance.status === targetStatus) return instance;
    if (instance.status === "error") {
      throw new Error(`DataCrunch instance ${id} entered error state`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `DataCrunch instance ${id} did not reach status "${targetStatus}" within ${timeoutMs / 1000}s`
  );
}
