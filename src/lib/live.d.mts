import type { Odds, Score } from './normalize'

export type Prediction = { pick: 'home' | 'draw' | 'away'; exact?: [number, number] }
export type Narrative = { kind: 'odds' | 'score'; title: string; detail: string }
export type SseMessage = { data: string; id?: string; event?: string }

export function oddsFromLive(payload: unknown, fixtureId: number): Odds | null
export function scoreFromLive(payload: unknown, fixtureId: number): Score | null
export function gradePrediction(call: Prediction | null, score: Score, winnerPoints?: number, exactBonus?: number): number
export function narrateOddsShift(previous: Odds | null, next: Odds | null, teams: { home: string; away: string }): Narrative | null
export function narrateScoreChange(previous: Score | null, next: Score | null, teams: { home: string; away: string }): Narrative | null
export function parseSseBlock(block: string): SseMessage | null
export function parseJson(value: string): unknown
