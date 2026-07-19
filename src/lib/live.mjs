const records = (value) => {
  if (Array.isArray(value)) return value.flatMap(records)
  if (!value || typeof value !== 'object') return []
  for (const key of ['data', 'Data', 'items', 'Items', 'odds', 'Odds', 'scores', 'Scores']) {
    if (key in value) return records(value[key])
  }
  return [value]
}

const field = (record, names) => {
  for (const name of names) if (record[name] !== undefined) return record[name]
  const normalized = new Map(Object.keys(record).map((key) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), key]))
  for (const name of names) {
    const key = normalized.get(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    if (key) return record[key]
  }
}

const fixtureRecords = (payload, fixtureId) => records(payload).filter((record) =>
  Number(field(record, ['FixtureId', 'fixtureId', 'fixture_id'])) === Number(fixtureId))

export function oddsFromLive(payload, fixtureId) {
  const matches = fixtureRecords(payload, fixtureId).filter((record) => {
    const market = String(field(record, ['SuperOddsType', 'superOddsType', 'market']) || '')
    const pct = field(record, ['Pct', 'pct'])
    return market.toUpperCase().includes('1X2') && Array.isArray(pct) && pct.length >= 3
  })
  const latest = matches[matches.length - 1]
  if (!latest) return null
  const pct = field(latest, ['Pct', 'pct']).slice(0, 3).map(Number)
  if (pct.some((value) => !Number.isFinite(value) || value < 0)) return null
  const total = pct.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return null
  return { home: pct[0] / total, draw: pct[1] / total, away: pct[2] / total }
}

export function scoreFromLive(payload, fixtureId) {
  const matches = fixtureRecords(payload, fixtureId)
  if (!matches.length) return null
  const withGoals = matches.filter((record) => record.Stats && record.Stats['1'] != null && record.Stats['2'] != null)
  const latest = (withGoals.length ? withGoals : matches)
    .slice()
    .sort((a, b) => Number(b.Seq || 0) - Number(a.Seq || 0))[0]
  const h = Number(latest?.Stats?.['1'] ?? 0)
  const a = Number(latest?.Stats?.['2'] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null
  const statusId = Number(latest.StatusId || 0)
  const scheduled = latest.GameState === 'scheduled'
  const finished = statusId >= 100 || latest.Action === 'game_finalised'
  const live = !scheduled && !finished && (statusId > 0 || withGoals.length > 0)
  return {
    h,
    a,
    status: finished ? 'Full time' : live ? 'Live' : scheduled ? 'Scheduled' : 'Awaiting kickoff',
    live,
    finished,
    seq: Number(latest.Seq || 0),
  }
}

export function gradePrediction(call, score, winnerPoints = 100, exactBonus = 150) {
  if (!call || !score?.finished) return 0
  const actual = score.h > score.a ? 'home' : score.h < score.a ? 'away' : 'draw'
  if (call.pick !== actual) return 0
  const exact = Array.isArray(call.exact) && call.exact[0] === score.h && call.exact[1] === score.a
  return winnerPoints + (exact ? exactBonus : 0)
}

const pct = (value) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`

export function narrateOddsShift(previous, next, teams) {
  if (!next) return null
  if (!previous) {
    const rows = [
      { label: teams.home, value: next.home },
      { label: 'The draw', value: next.draw },
      { label: teams.away, value: next.away },
    ]
    const leader = rows.reduce((a, b) => b.value > a.value ? b : a)
    return { kind: 'odds', title: `${leader.label} opens as the consensus call`, detail: `TxLINE puts the leading outcome at ${Math.round(leader.value * 100)}%.` }
  }
  const deltas = [
    { label: teams.home, delta: next.home - previous.home, value: next.home },
    { label: 'The draw', delta: next.draw - previous.draw, value: next.draw },
    { label: teams.away, delta: next.away - previous.away, value: next.away },
  ]
  const mover = deltas.reduce((a, b) => Math.abs(b.delta) > Math.abs(a.delta) ? b : a)
  if (Math.abs(mover.delta) < 0.004) return null
  const oldLeader = [
    { label: teams.home, value: previous.home },
    { label: 'The draw', value: previous.draw },
    { label: teams.away, value: previous.away },
  ].reduce((a, b) => b.value > a.value ? b : a)
  const newLeader = deltas.reduce((a, b) => b.value > a.value ? b : a)
  return {
    kind: 'odds',
    title: oldLeader.label !== newLeader.label ? `Momentum flips to ${newLeader.label}` : `${mover.label} ${mover.delta > 0 ? 'gains ground' : 'loses support'}`,
    detail: `The latest TxLINE tick moved ${mover.label.toLowerCase()} ${pct(mover.delta)} to ${Math.round(mover.value * 100)}%.`,
  }
}

export function narrateScoreChange(previous, next, teams) {
  if (!next || !previous || (next.h === previous.h && next.a === previous.a)) return null
  const scorer = next.h > previous.h ? teams.home : next.a > previous.a ? teams.away : 'The match'
  const leader = next.h === next.a ? 'The match is level again.' : `${next.h > next.a ? teams.home : teams.away} now leads.`
  return { kind: 'score', title: `${scorer} changes the room`, detail: `${next.h}–${next.a}. ${leader} New TxLINE odds will show how the consensus reacts.` }
}

export function parseSseBlock(block) {
  const message = { data: '' }
  for (const rawLine of String(block).split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(':')) continue
    const split = rawLine.indexOf(':')
    const name = split < 0 ? rawLine : rawLine.slice(0, split)
    const value = split < 0 ? '' : rawLine.slice(split + 1).replace(/^ /, '')
    if (name === 'data') message.data += `${value}\n`
    if (name === 'id' && !value.includes('\0')) message.id = value
    if (name === 'event') message.event = value
  }
  message.data = message.data.replace(/\n$/, '')
  return message.data || message.id || message.event ? message : null
}

export function parseJson(value) {
  try { return JSON.parse(value) } catch { return null }
}
