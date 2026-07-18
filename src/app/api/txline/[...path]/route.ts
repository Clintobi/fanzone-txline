import { NextRequest, NextResponse } from 'next/server'
import { upstream } from '@/lib/txline-server'
import type { Fixture } from '@/lib/normalize'

// Server-side TxLINE proxy. The browser calls /api/txline/<path>; this attaches
// the guest JWT + subscription token (both server-only, via txline-server) and
// forwards to TxLINE. Benefits over calling TxLINE from the browser:
//   - the API token never ships in the client bundle,
//   - a transient CloudFront/rate-limit failure returns cached/fallback fixtures
//     instead of leaving the UI stuck on "Loading fixtures…".

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// last-good fixtures cache + hard fallback so the match list is never empty
let fixturesCache: Fixture[] | null = null
const FALLBACK_FIXTURES: Fixture[] = [
  { FixtureId: 18257739, CompetitionId: 72, Competition: 'World Cup', Participant1: 'Spain', Participant2: 'Argentina', Participant1IsHome: true, StartTime: 1784487600000 },
  { FixtureId: 18257865, CompetitionId: 72, Competition: 'World Cup', Participant1: 'France', Participant2: 'England', Participant1IsHome: true, StartTime: 1784408400000 },
]

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (params.path || []).join('/')
  const search = req.nextUrl.search || ''
  const isFixtures = path.startsWith('fixtures/snapshot')

  const { status, body } = await upstream(path, search)

  if (status >= 200 && status < 300) {
    if (isFixtures) {
      const arr = Array.isArray(body) ? body : []
      if (arr.length) fixturesCache = arr
      return NextResponse.json(arr.length ? arr : (fixturesCache ?? FALLBACK_FIXTURES))
    }
    return NextResponse.json(body)
  }

  // upstream error — degrade gracefully for fixtures, surface status otherwise
  if (isFixtures) return NextResponse.json(fixturesCache ?? FALLBACK_FIXTURES)
  return NextResponse.json({ error: 'upstream', status }, { status: status || 502 })
}
