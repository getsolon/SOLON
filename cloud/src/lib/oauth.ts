export interface OAuthUserProfile {
  id: string
  name: string
  email: string
  avatar_url: string | null
}

// --- GitHub ---

export function githubAuthURL(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: '', // filled by GitHub from app settings
    scope: 'read:user user:email',
    state,
  })
  // remove empty redirect_uri — let GitHub use the one configured in the app
  params.delete('redirect_uri')
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user+user:email&state=${state}`
}

export async function exchangeGitHubCode(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(data.error || 'GitHub token exchange failed')
  return data.access_token
}

export async function fetchGitHubProfile(accessToken: string): Promise<OAuthUserProfile> {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'solon-cloud' },
  })
  const user = await res.json() as { id: number; name: string | null; login: string; email: string | null; avatar_url: string }

  let email = user.email
  if (!email) {
    // Fetch private email
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'solon-cloud' },
    })
    const emails = await emailRes.json() as { email: string; primary: boolean; verified: boolean }[]
    const primary = emails.find(e => e.primary && e.verified)
    email = primary?.email || emails.find(e => e.verified)?.email || null
  }

  return {
    id: String(user.id),
    name: user.name || user.login,
    email: email || '',
    avatar_url: user.avatar_url,
  }
}

// --- Google ---

export function googleAuthURL(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGoogleCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(data.error || 'Google token exchange failed')
  return data.access_token
}

export async function fetchGoogleProfile(accessToken: string): Promise<OAuthUserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const user = await res.json() as { id: string; name: string; email: string; picture: string }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.picture || null,
  }
}

// --- State helpers ---

export function generateState(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
