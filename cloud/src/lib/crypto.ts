const ENC = new TextEncoder()
const DEC = new TextDecoder()

async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', ENC.encode(secret), 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: ENC.encode('solon-instance-key') },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(plaintext: string, encryptionKey: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(encryptionKey, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, ENC.encode(plaintext))

  // Format: base64(salt + iv + ciphertext)
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)

  let binary = ''
  for (const b of combined) binary += String.fromCharCode(b)
  return btoa(binary)
}

export async function decrypt(encoded: string, encryptionKey: string): Promise<string> {
  const binary = atob(encoded)
  const combined = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i)

  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const ciphertext = combined.slice(28)

  const key = await deriveKey(encryptionKey, salt)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return DEC.decode(plaintext)
}
