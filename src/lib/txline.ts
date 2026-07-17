// Client TxLINE access — routed through this app's server-side proxy at /api/txline.
// The browser never talks to TxLINE directly, so the API token stays server-only and
// a CloudFront blip on one request can't leave the UI stuck on "Loading fixtures…".
// (Live scores are polled from /api/txline/scores/snapshot by the UI; this keeps the
// data path reliable on Vercel's serverless runtime, where long-lived SSE is flaky.)

export type Fixture = {
  FixtureId: number
  CompetitionId: number
  StartTime: string | number
  Participant1: string
  Participant2: string
  Participant1IsHome: boolean
  GameState?: number | string
  Status?: string
}

export type ScoreRecord = {
  FixtureId?: number
  Seq?: number
  Ts?: number
  StatusId?: number
  Period?: number
  Action?: string
  GameState?: string
  Stats?: Record<string, number>
}

const BASE = '/api/txline'

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/${path}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`${path} -> ${r.status}`)
  return (await r.json()) as T
}

export class TxlineClient {
  // kept for API compatibility with existing callers; auth now happens server-side.
  async authenticate(): Promise<void> { /* no-op: the proxy holds the guest JWT + token */ }

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

// Normalize raw TxLINE score records into home/away goals + a live/finished status.
// Goal stat keys 1,2 = the two teams' goals.
export function readScore(rows: ScoreRecord[]): { h: number; a: number; status: string; live: boolean; finished: boolean } {
  if (!rows.length) return { h: 0, a: 0, status: 'Awaiting kickoff', live: false, finished: false }
  const withGoals = rows.filter(r => r.Stats && r.Stats['1'] != null && r.Stats['2'] != null)
  const latest = (withGoals.length ? withGoals : rows).slice().sort((a, b) => (b.Seq ?? 0) - (a.Seq ?? 0))[0]
  const h = Number(latest?.Stats?.['1'] ?? 0)
  const a = Number(latest?.Stats?.['2'] ?? 0)
  const statusId = latest?.StatusId ?? 0
  const finished = statusId >= 100 || latest?.Action === 'game_finalised'
  const live = statusId > 0 && statusId < 100
  return { h, a, status: finished ? 'Full time' : live ? 'Live' : 'Awaiting kickoff', live, finished }
}

export const txline = new TxlineClient()
