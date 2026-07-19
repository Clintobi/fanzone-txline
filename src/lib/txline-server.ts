import 'server-only'

// Server-only TxLINE access. Holds the guest JWT + subscription token so the
// browser never sees either, and gives both the /api/txline proxy and the
// /api/txline/featured scanner one shared, cached auth path.

export const API_ORIGIN = process.env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com'
// TxLINE's hackathon devnet read token. It is required at runtime, held only in
// the deployment environment, and never shipped to the client bundle.
export const API_TOKEN = process.env.TXLINE_API_TOKEN || ''

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

// --- on-chain settlement proof -------------------------------------------------
// TxLINE anchors a Merkle root of match stats on Solana. stat-validation returns
// the proof chain (eventStatRoot + sub/main tree proofs) for a fixture+seq — the
// same on-chain attestation TxODDS publishes. We surface it so a settled result
// is "verified from TxLINE's on-chain proof", not "trust our app".

function toHex(v: unknown): string | undefined {
  if (Array.isArray(v)) return Buffer.from(v as number[]).toString('hex')
  if (typeof v === 'string') return v.replace(/^0x/, '')
  return undefined
}

export async function fetchStatValidation(fixtureId: number, seq: number, statKeys = '1,2'): Promise<any> {
  const { status, body } = await upstream(`scores/stat-validation`, `?fixtureId=${fixtureId}&seq=${seq}&statKeys=${statKeys}`)
  return status >= 200 && status < 300 ? body : null
}

export type Settlement = {
  fixtureId: number
  verified: boolean
  root?: string        // hex Merkle root anchored on Solana
  seq?: number
  h?: number
  a?: number
  detail: string
}

// Prove a fixture's latest/final scoreline against TxLINE's on-chain Merkle root.
export async function settlementProof(fixtureId: number): Promise<Settlement> {
  const rows = await upstreamArray(`scores/snapshot/${fixtureId}`)
  const withGoals = rows.filter(r => r.Stats && r.Stats['1'] != null && r.Stats['2'] != null && r.Seq != null)
  const latest = withGoals.slice().sort((a, b) => (b.Seq ?? 0) - (a.Seq ?? 0))[0]
  if (!latest) return { fixtureId, verified: false, detail: 'No settled score event to prove yet.' }
  const proof = await fetchStatValidation(fixtureId, latest.Seq, '1,2')
  const root = proof && typeof proof === 'object'
    ? (toHex(proof.eventStatRoot) ?? toHex(proof?.summary?.eventStatsSubTreeRoot) ?? toHex(proof?.summary?.updateSubTreeRoot))
    : undefined
  return {
    fixtureId,
    verified: Boolean(root),
    root,
    seq: latest.Seq,
    h: Number(latest.Stats['1']), a: Number(latest.Stats['2']),
    detail: root
      ? 'Result carries TxLINE’s stat-validation Merkle root — the exact value TxODDS anchors on-chain.'
      : 'Attestation not published for this event yet.',
  }
}
