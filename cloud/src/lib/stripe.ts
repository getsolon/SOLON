// Stripe API helpers for Cloudflare Workers (uses fetch, not Node SDK)

const STRIPE_API = 'https://api.stripe.com/v1'

// Managed hosting tier pricing
export const MANAGED_TIERS: Record<string, { name: string; price: number; serverType: string }> = {
  starter: { name: 'Starter', price: 2900, serverType: 'cx22' },
  pro: { name: 'Pro', price: 5900, serverType: 'cx42' },
  gpu: { name: 'GPU', price: 34900, serverType: 'gx11' },
}

async function stripeRequest(
  path: string,
  secretKey: string,
  method: string = 'GET',
  body?: Record<string, string>,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  }

  let bodyStr: string | undefined
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    bodyStr = new URLSearchParams(body).toString()
  }

  const resp = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body: bodyStr,
  })

  const data = await resp.json() as Record<string, unknown>
  if (!resp.ok) {
    const err = data.error as Record<string, string> | undefined
    throw new Error(err?.message || `Stripe error: ${resp.status}`)
  }
  return data
}

export async function createCheckoutSession(
  secretKey: string,
  params: {
    userId: string
    userEmail: string
    tier: string
    region: string
    instanceName: string
    successUrl: string
    cancelUrl: string
  },
): Promise<{ id: string; url: string }> {
  const tierInfo = MANAGED_TIERS[params.tier]
  if (!tierInfo) throw new Error(`Unknown tier: ${params.tier}`)

  const data = await stripeRequest('/checkout/sessions', secretKey, 'POST', {
    'mode': 'subscription',
    'success_url': params.successUrl,
    'cancel_url': params.cancelUrl,
    'customer_email': params.userEmail,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': `Solon Managed — ${tierInfo.name}`,
    'line_items[0][price_data][product_data][description]': `Managed Solon server (${params.tier})`,
    'line_items[0][price_data][unit_amount]': String(tierInfo.price),
    'line_items[0][price_data][recurring][interval]': 'month',
    'line_items[0][quantity]': '1',
    'metadata[user_id]': params.userId,
    'metadata[tier]': params.tier,
    'metadata[region]': params.region,
    'metadata[instance_name]': params.instanceName,
    'subscription_data[metadata][user_id]': params.userId,
    'subscription_data[metadata][tier]': params.tier,
  }) as { id: string; url: string }

  return { id: data.id, url: data.url }
}

export async function createPortalSession(
  secretKey: string,
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const data = await stripeRequest('/billing_portal/sessions', secretKey, 'POST', {
    customer: customerId,
    return_url: returnUrl,
  }) as { url: string }
  return { url: data.url }
}

// Verify Stripe webhook signature (crypto.subtle compatible)
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=')
    acc[k] = v
    return acc
  }, {})

  const timestamp = parts['t']
  const sig = parts['v1']
  if (!timestamp || !sig) return false

  // Check timestamp tolerance (5 minutes)
  const ts = parseInt(timestamp, 10)
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false

  const signedPayload = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))

  const expectedHex = Array.from(new Uint8Array(expected))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return expectedHex === sig
}
