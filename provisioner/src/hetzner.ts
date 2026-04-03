import type { HetznerServerResponse } from './types'

const HETZNER_API = 'https://api.hetzner.cloud/v1'

async function hetznerRequest(
  path: string,
  token: string,
  method: string = 'GET',
  body?: Record<string, unknown>,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const resp = await fetch(`${HETZNER_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Hetzner API error ${resp.status}: ${text}`)
  }

  if (resp.status === 204) return null
  return resp.json()
}

export async function createServer(
  token: string,
  opts: {
    name: string
    serverType: string
    location: string
    userData: string
    labels: Record<string, string>
    sshKeyNames?: string[]
  },
): Promise<HetznerServerResponse> {
  const body: Record<string, unknown> = {
    name: opts.name,
    server_type: opts.serverType,
    image: 'ubuntu-24.04',
    location: opts.location,
    user_data: opts.userData,
    labels: opts.labels,
    public_net: {
      enable_ipv4: true,
      enable_ipv6: true,
    },
    start_after_create: true,
  }

  if (opts.sshKeyNames && opts.sshKeyNames.length > 0) {
    body['ssh_keys'] = opts.sshKeyNames
  }

  return (await hetznerRequest('/servers', token, 'POST', body)) as HetznerServerResponse
}

export async function deleteServer(token: string, serverId: number): Promise<void> {
  await hetznerRequest(`/servers/${serverId}`, token, 'DELETE')
}

export async function getServer(
  token: string,
  serverId: number,
): Promise<HetznerServerResponse> {
  return (await hetznerRequest(`/servers/${serverId}`, token)) as HetznerServerResponse
}

/**
 * Find a server by label (instance_id)
 */
export async function findServerByInstanceId(
  token: string,
  instanceId: string,
): Promise<{ id: number; ipv4: string; status: string } | null> {
  const resp = (await hetznerRequest(
    `/servers?label_selector=solon_instance_id=${instanceId}`,
    token,
  )) as { servers: Array<{ id: number; status: string; public_net: { ipv4: { ip: string } } }> }

  const server = resp.servers[0]
  if (!server) return null

  return {
    id: server.id,
    ipv4: server.public_net.ipv4.ip,
    status: server.status,
  }
}
