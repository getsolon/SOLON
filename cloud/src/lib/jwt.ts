import type { JWTPayload } from '../types'

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const enc = new TextEncoder()
  const headerB64 = base64url(enc.encode(JSON.stringify(header)).buffer as ArrayBuffer)
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)).buffer as ArrayBuffer)
  const data = `${headerB64}.${payloadB64}`
  const key = await getKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return `${data}.${base64url(sig)}`
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')

  const [headerB64, payloadB64, sigB64] = parts
  const key = await getKey(secret)
  const enc = new TextEncoder()
  const data = `${headerB64}.${payloadB64}`
  const sig = base64urlDecode(sigB64)

  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data))
  if (!valid) throw new Error('Invalid signature')

  const payload: JWTPayload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)))
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired')

  return payload
}
