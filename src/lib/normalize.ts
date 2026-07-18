// Pure TxLINE normalizers — no browser or server dependencies, safe to import
// from both the client bundle and server routes.

export type Fixture = {
  FixtureId: number
  CompetitionId?: number
  Competition?: string
  StartTime: string | number
  Participant1: string
  Participant2: string
  Participant1IsHome?: boolean
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

export type Score = { h: number; a: number; status: string; live: boolean; finished: boolean; seq: number }
export type Odds = { home: number; draw: number; away: number }

// Normalize raw TxLINE score records into home/away goals + a live/finished status.
// Goal stat keys 1,2 = the two participants' goals.
export function readScore(rows: ScoreRecord[]): Score {
  if (!Array.isArray(rows) || !rows.length) {
    return { h: 0, a: 0, status: 'Awaiting kickoff', live: false, finished: false, seq: 0 }
  }
  const withGoals = rows.filter(r => r.Stats && r.Stats['1'] != null && r.Stats['2'] != null)
  const latest = (withGoals.length ? withGoals : rows).slice().sort((a, b) => (b.Seq ?? 0) - (a.Seq ?? 0))[0]
  const h = Number(latest?.Stats?.['1'] ?? 0)
  const a = Number(latest?.Stats?.['2'] ?? 0)
  const statusId = latest?.StatusId ?? 0
  const scheduled = latest?.GameState === 'scheduled'
  const finished = statusId >= 100 || latest?.Action === 'game_finalised'
  const live = !scheduled && !finished && (statusId > 0 || withGoals.length > 0)
  return {
    h, a,
    status: finished ? 'Full time' : live ? 'Live' : scheduled ? 'Scheduled' : 'Awaiting kickoff',
    live, finished, seq: latest?.Seq ?? 0,
  }
}

// Latest de-margined 1X2 win-probabilities (home/draw/away) from an odds snapshot.
// Returns null when no genuine 1X2 market is posted yet — we never fabricate a bar.
export function readOdds(rows: any[]): Odds | null {
  if (!Array.isArray(rows)) return null
  const x12 = rows.filter(o =>
    (o.SuperOddsType || '').includes('1X2') &&
    Array.isArray(o.Pct) && o.Pct.length >= 3 &&
    o.Pct.every((x: any) => x !== 'NA' && x != null && x !== ''))
  const rec = x12[x12.length - 1]
  if (!rec) return null
  const [h, d, a] = rec.Pct.map(Number)
  const s = h + d + a || 1
  return { home: h / s, draw: d / s, away: a / s }
}

// Score a fixture for "featured" selection: we want the match that best shows
// the app off — a live one with a real 1X2 market and goals beats a scheduled one.
export function featuredScore(hasOdds: boolean, s: Score): number {
  let n = 0
  if (hasOdds) n += 4          // real live win-prob bar to show
  if (s.live) n += 3           // in-play right now
  if (s.h + s.a > 0) n += 2    // goals on the board
  if (s.finished) n += 1       // a finished match still grades picks + shows a real result
  return n
}
