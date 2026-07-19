import test from 'node:test'
import assert from 'node:assert/strict'
import replay from './fixtures/fanzone-live-replay.json' with { type: 'json' }
import {
  gradePrediction,
  narrateOddsShift,
  narrateScoreChange,
  oddsFromLive,
  parseSseBlock,
  scoreFromLive,
} from '../src/lib/live.mjs'

const fixture = 18257865

test('maps a TxLINE 1X2 tick into normalized probabilities', () => {
  const odds = oddsFromLive(replay[0].payload, fixture)
  assert.deepEqual(odds, { home: 0.48, draw: 0.28, away: 0.24 })
})

test('ignores malformed and unrelated odds records', () => {
  assert.equal(oddsFromLive({ FixtureId: fixture, SuperOddsType: '1X2', Pct: ['NA', 20, 80] }, fixture), null)
  assert.equal(oddsFromLive({ FixtureId: 99, SuperOddsType: '1X2', Pct: [50, 25, 25] }, fixture), null)
})

test('maps live and final TxLINE score events', () => {
  const live = scoreFromLive(replay[1].payload, fixture)
  const final = scoreFromLive(replay[4].payload, fixture)
  assert.equal(live.live, true)
  assert.equal(final.finished, true)
  assert.deepEqual([final.h, final.a], [2, 1])
})

test('grades winner and exact-score calls deterministically', () => {
  const final = scoreFromLive(replay[4].payload, fixture)
  assert.equal(gradePrediction({ pick: 'home' }, final), 100)
  assert.equal(gradePrediction({ pick: 'home', exact: [2, 1] }, final), 250)
  assert.equal(gradePrediction({ pick: 'away', exact: [2, 1] }, final), 0)
})

test('derives a readable narrative from odds and score changes', () => {
  const first = oddsFromLive(replay[0].payload, fixture)
  const second = oddsFromLive(replay[2].payload, fixture)
  const oddsLine = narrateOddsShift(first, second, { home: 'France', away: 'England' })
  const scoreLine = narrateScoreChange(
    { h: 0, a: 0, status: 'Live', live: true, finished: false, seq: 1 },
    scoreFromLive(replay[1].payload, fixture),
    { home: 'France', away: 'England' },
  )
  assert.match(oddsLine.title, /France/)
  assert.match(oddsLine.detail, /TxLINE/)
  assert.match(scoreLine.title, /France/)
})

test('parses multi-line SSE blocks without depending on chunk boundaries', () => {
  assert.deepEqual(parseSseBlock('id: 7\nevent: odds\ndata: {"a":\ndata: 1}'), {
    id: '7', event: 'odds', data: '{"a":\n1}',
  })
})
