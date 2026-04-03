const ENC = new TextEncoder()

/**
 * Verify an HMAC-SHA256 signature in the format: t=<timestamp>,v1=<hex>
 */
export async function verifyHMAC(
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const eq = part.indexOf('=')
    if (eq > 0) {
      acc[part.slice(0, eq)] = part.slice(eq + 1)
    }
    return acc
  }, {})

  const timestamp = parts['t']
  const sig = parts['v1']
  if (!timestamp || !sig) return false

  // Reject signatures older than 5 minutes
  const ts = parseInt(timestamp, 10)
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const key = await crypto.subtle.importKey(
    'raw',
    ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = await crypto.subtle.sign('HMAC', key, ENC.encode(`${timestamp}.${body}`))
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return expectedHex === sig
}

/**
 * Create an HMAC-SHA256 signature header: t=<timestamp>,v1=<hex>
 */
export async function signHMAC(body: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const key = await crypto.subtle.importKey(
    'raw',
    ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, ENC.encode(`${timestamp}.${body}`))
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `t=${timestamp},v1=${sigHex}`
}
