const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const ID_LENGTH = 21

function nanoid(length = ID_LENGTH): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let id = ''
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return id
}

export function userId(): string {
  return `usr_${nanoid()}`
}

export function instanceId(): string {
  return `inst_${nanoid()}`
}

export function tokenId(): string {
  return `tok_${nanoid()}`
}

export function teamId(): string {
  return `team_${nanoid()}`
}

export function memberId(): string {
  return `mem_${nanoid()}`
}

export function refreshTokenId(): string {
  return `rt_${nanoid()}`
}
