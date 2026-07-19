import assert from 'node:assert/strict'
import replay from '../test/fixtures/fanzone-live-replay.json' with { type: 'json' }
import { gradePrediction, narrateOddsShift, oddsFromLive, scoreFromLive } from '../src/lib/live.mjs'

const fixtureId = 18257865
const checks = []
const check = (name, fn) => {
  fn()
  checks.push(name)
  console.log(`✓ ${name}`)
}

console.log('Fan Zone credential-free judge replay\n')

const oddsEvents = replay.filter((event) => event.kind === 'odds')
const scoreEvents = replay.filter((event) => event.kind === 'scores')

check('offline replay fixture contains both TxLINE odds and score events', () => {
  assert.ok(oddsEvents.length >= 3 && scoreEvents.length >= 2)
})

const odds = oddsEvents.map((event) => oddsFromLive(event.payload, fixtureId))
check('every replayed 1X2 tick maps to a normalized probability', () => {
  assert.ok(odds.every(Boolean))
  odds.forEach((row) => assert.ok(Math.abs(row.home + row.draw + row.away - 1) < 1e-9))
})

const liveScore = scoreFromLive(scoreEvents[0].payload, fixtureId)
const finalScore = scoreFromLive(scoreEvents.at(-1).payload, fixtureId)
check('score mapping distinguishes live from final', () => {
  assert.equal(liveScore.live, true)
  assert.equal(finalScore.finished, true)
})

check('narrative feed reacts deterministically to the odds stream', () => {
  const line = narrateOddsShift(odds[0], odds[1], { home: 'France', away: 'England' })
  assert.ok(line?.title && line?.detail.includes('TxLINE'))
})

check('winner and exact-score bonuses grade from the final feed', () => {
  assert.equal(gradePrediction({ pick: 'home' }, finalScore), 100)
  assert.equal(gradePrediction({ pick: 'home', exact: [2, 1] }, finalScore), 250)
})

check('malformed feed records fail closed', () => {
  assert.equal(oddsFromLive({ FixtureId: fixtureId, SuperOddsType: '1X2', Pct: ['NA', null, 1] }, fixtureId), null)
  assert.equal(scoreFromLive({ FixtureId: fixtureId, Stats: { 1: 'broken', 2: 0 } }, fixtureId), null)
})

console.log(`\nALL CHECKS PASS · ${checks.length} / ${checks.length}`)
console.log('No wallet, token, RPC, database, or third-party account was used.')
