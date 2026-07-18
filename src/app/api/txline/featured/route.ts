import { NextResponse } from 'next/server'
import { upstream, upstreamArray, API_TOKEN } from '@/lib/txline-server'
import { readScore, readOdds, featuredScore, type Fixture } from '@/lib/normalize'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Picks the fixture that best demonstrates the app right now — one with a real
// live 1X2 market and, ideally, in-play with goals — by scanning odds + scores
// server-side. This is why the flagship never sits on a flat placeholder bar:
// if a livelier real match exists in the feed, we feature it.

// last-good fixtures + a hard fallback so the match list is never empty
let fixturesCache: Fixture[] | null = null
const FALLBACK_FIXTURES: Fixture[] = [
  { FixtureId: 18257739, CompetitionId: 72, Competition: 'World Cup', Participant1: 'Spain', Participant2: 'Argentina', Participant1IsHome: true, StartTime: 1784487600000 },
  { FixtureId: 18257865, CompetitionId: 72, Competition: 'World Cup', Participant1: 'France', Participant2: 'England', Participant1IsHome: true, StartTime: 1784408400000 },
]

// short result cache so a room full of pollers doesn't hammer the flaky feed
let cache: { at: number; payload: any } | null = null
const CACHE_TTL = 6000
const MAX_SCAN = 8 // cap odds/score probes per refresh

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL) return NextResponse.json(cache.payload)

  // 1) fixtures
  const fxRes = await upstream('fixtures/snapshot')
  const rawFx: Fixture[] = fxRes.status >= 200 && fxRes.status < 300 && Array.isArray(fxRes.body) ? fxRes.body : []
  if (rawFx.length) fixturesCache = rawFx
  const fixtures = (rawFx.length ? rawFx : (fixturesCache ?? FALLBACK_FIXTURES))
  const usingFallback = !rawFx.length

  // 2) probe odds + scores for the candidate fixtures, in parallel, and score them
  const candidates = fixtures.slice(0, MAX_SCAN)
  const probed = await Promise.all(candidates.map(async (f) => {
    const [oddsRows, scoreRows] = await Promise.all([
      upstreamArray(`odds/snapshot/${f.FixtureId}`),
      upstreamArray(`scores/snapshot/${f.FixtureId}`),
    ])
    const odds = readOdds(oddsRows)
    const score = readScore(scoreRows)
    return { f, odds, score, rank: featuredScore(!!odds, score) }
  }))

  // 3) pick the best; ties prefer a World Cup fixture, then latest start (the "final" feel)
  const isWC = (f: Fixture) => (f.CompetitionId === 72 || /world cup/i.test(f.Competition || '')) ? 1 : 0
  probed.sort((a, b) =>
    b.rank - a.rank ||
    isWC(b.f) - isWC(a.f) ||
    (+new Date(b.f.StartTime) - +new Date(a.f.StartTime)))
  const best = probed[0]
  const featured = best?.f ?? fixtures[0] ?? FALLBACK_FIXTURES[0]

  const payload = {
    txlineConfigured: Boolean(API_TOKEN),
    scannedAt: Date.now(),
    usingFallback,
    fixtures,
    featuredId: featured.FixtureId,
    score: best?.score ?? { h: 0, a: 0, status: 'Awaiting kickoff', live: false, finished: false, seq: 0 },
    odds: best?.odds ?? null,
    oddsLive: Boolean(best?.odds),
    source: usingFallback ? 'fallback' : best?.score.live ? 'live' : best?.score.finished ? 'final' : 'scheduled',
  }

  // only cache real scans, never the empty-feed fallback (so we recover fast)
  if (!usingFallback) cache = { at: Date.now(), payload }
  return NextResponse.json(payload)
}
