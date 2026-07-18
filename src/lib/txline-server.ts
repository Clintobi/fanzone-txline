import 'server-only'

// Server-only TxLINE access. Holds the guest JWT + subscription token so the
// browser never sees either, and gives both the /api/txline proxy and the
// /api/txline/featured scanner one shared, cached auth path.

export const API_ORIGIN = process.env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com'
// Free-tier devnet read token, obtained once via TxLINE's on-chain subscribe flow.
// Kept server-side; never shipped to the client bundle.
export const API_TOKEN = process.env.TXLINE_API_TOKEN || 'txoracle_api_6f0df6e475c04668b9a3a19aa1eefda4'

// --- guest JWT, cached across requests within a warm lambda ---
let jwt: string | null = null
let jwtAt = 0
const JWT_TTL = 10 * 60 * 1000
export async function guestJwt(): Promise<string | null> {
  if (jwt && Date.now() - jwtAt < JWT_TTL) return jwt
  try {
    const r = await fetch(`${API_ORIGIN}/auth/guest/start`, { method: 'POST', cache: 'no-store' })
    if (!r.ok) return jwt // keep any stale token rather than nothing
    jwt = (await r.json()).token
    jwtAt = Date.now()
    return jwt
  } catch {
    return jwt
  }
}

export type Upstream = { status: number; body: any }

// Raw GET against TxLINE for a given /api/<path><search>. The dev feed is flaky
// and rate-limited, so callers are expected to degrade gracefully on non-2xx.
export async function upstream(path: string, search = ''): Promise<Upstream> {
  const token = await guestJwt()
  try {
    const r = await fetch(`${API_ORIGIN}/api/${path}${search}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'X-Api-Token': API_TOKEN,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    const text = await r.text()
    let body: any
    try { body = JSON.parse(text) } catch { body = text }
    return { status: r.status, body }
  } catch (e: any) {
    return { status: 0, body: { error: String(e?.message || e) } }
  }
}

// Convenience: return the JSON array for a path, or [] on any failure.
export async function upstreamArray(path: string): Promise<any[]> {
  const { status, body } = await upstream(path)
  return status >= 200 && status < 300 && Array.isArray(body) ? body : []
}
