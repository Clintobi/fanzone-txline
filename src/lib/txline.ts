// Client TxLINE access — routed through this app's server-side proxy at /api/txline.
// The browser never talks to TxLINE directly, so the API token stays server-only and
// a rate-limit blip on one request can't leave the UI stuck on "Loading fixtures…".
// Live data is polled from the proxy; pure normalizers live in ./normalize and are
// shared with the server-side featured scanner.

import { readScore, readOdds, type Fixture, type ScoreRecord, type Score, type Odds } from './normalize'

export { readScore, readOdds }
export type { Fixture, ScoreRecord, Score, Odds }

// Shape returned by /api/txline/featured — the server-picked liveliest real match.
export type Featured = {
  txlineConfigured: boolean
  scannedAt: number
  usingFallback: boolean
  fixtures: Fixture[]
  featuredId: number
  score: Score
  odds: Odds | null
  oddsLive: boolean
  source: 'live' | 'final' | 'scheduled' | 'fallback'
}

const BASE = '/api/txline'

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/${path}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`${path} -> ${r.status}`)
  return (await r.json()) as T
}

export class TxlineClient {
  // kept for API compatibility with existing callers; auth happens server-side.
  async authenticate(): Promise<void> { /* no-op: the proxy holds the guest JWT + token */ }

  // One call that returns all fixtures plus the server-selected featured match
  // (already scored for liveness) with its current score + real 1X2 odds.
  async getFeatured(): Promise<Featured> {
    return getJson<Featured>('featured')
  }

  async getFixtures(competitionId?: number): Promise<Fixture[]> {
    const q = competitionId ? `?competitionId=${competitionId}` : ''
    const data = await getJson<Fixture[]>(`fixtures/snapshot${q}`)
    return Array.isArray(data) ? data : []
  }

  async getScoresSnapshot(fixtureId: number): Promise<ScoreRecord[]> {
    const data = await getJson<ScoreRecord[]>(`scores/snapshot/${fixtureId}`)
    return Array.isArray(data) ? data : []
  }

  async getOddsSnapshot(fixtureId: number): Promise<any[]> {
    const data = await getJson<any[]>(`odds/snapshot/${fixtureId}`)
    return Array.isArray(data) ? data : []
  }
}

export const txline = new TxlineClient()
