import { NextRequest, NextResponse } from 'next/server'

// Server-side TxLINE proxy. The browser calls /api/txline/<path>; this handler
// attaches the guest JWT + subscription token (both server-only) and forwards to
// TxLINE. Benefits over calling TxLINE from the browser:
//   - the API token never ships in the client bundle,
//   - a transient CloudFront failure returns cached/fallback data instead of
//     leaving the UI stuck on "Loading fixtures…".

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const API_ORIGIN = process.env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com'
// Free-tier devnet read token (server-only here; also has a NEXT_PUBLIC fallback in
// the client for local dev, but production keeps it out of the bundle via this proxy).
const API_TOKEN = process.env.TXLINE_API_TOKEN || 'txoracle_api_6f0df6e475c04668b9a3a19aa1eefda4'

// --- guest JWT, cached across requests (module scope survives within a warm lambda) ---
let jwt: string | null = null
let jwtAt = 0
const JWT_TTL = 10 * 60 * 1000
async function guestJwt(): Promise<string | null> {
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

// --- last-good fixtures cache + hard fallback so the match list is never empty ---
let fixturesCache: any[] | null = null
const FALLBACK_FIXTURES = [
  { FixtureId: 18257865, CompetitionId: 72, Participant1: 'France', Participant2: 'England', Participant1IsHome: true, StartTime: 1784408400000 },
  { FixtureId: 18257739, CompetitionId: 72, Participant1: 'Spain', Participant2: 'Argentina', Participant1IsHome: true, StartTime: 1784487600000 },
]

async function upstream(path: string, search: string): Promise<{ status: number; body: any }> {
  const token = await guestJwt()
  const url = `${API_ORIGIN}/api/${path}${search}`
  const r = await fetch(url, {
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
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (params.path || []).join('/')
  const search = req.nextUrl.search || ''
  const isFixtures = path.startsWith('fixtures/snapshot')

  try {
    const { status, body } = await upstream(path, search)
    if (status >= 200 && status < 300) {
      if (isFixtures) {
        const arr = Array.isArray(body) ? body : []
        if (arr.length) fixturesCache = arr
        // never hand the UI an empty list
        return NextResponse.json(arr.length ? arr : (fixturesCache ?? FALLBACK_FIXTURES))
      }
      return NextResponse.json(body)
    }
    // upstream error — degrade gracefully for fixtures, surface status otherwise
    if (isFixtures) return NextResponse.json(fixturesCache ?? FALLBACK_FIXTURES)
    return NextResponse.json({ error: 'upstream', status }, { status: 502 })
  } catch (e: any) {
    if (isFixtures) return NextResponse.json(fixturesCache ?? FALLBACK_FIXTURES)
    return NextResponse.json({ error: 'proxy_failure', message: String(e?.message || e) }, { status: 502 })
  }
}
