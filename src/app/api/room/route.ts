import { NextRequest, NextResponse } from 'next/server'
import { submitScore, leaderboard, kvLive } from '@/lib/kv'
import { roomCallsOnChain, commitEnabled } from '@/lib/solana'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const clean = (s: string) => (s || '').slice(0, 24).replace(/[^\w .\-]/g, '').trim()

export async function GET(req: NextRequest) {
  const room = clean(req.nextUrl.searchParams.get('room') || 'final')
  // The board is genuinely shared across devices with no database: every call is
  // an on-chain Memo, so we read the room's callers straight from Solana and merge
  // them with any local/KV points. Everyone who called shows up, everywhere.
  const [board, onchain] = await Promise.all([leaderboard(room), roomCallsOnChain(room)])
  const byName = new Map<string, number>(board.map(r => [r.name, r.pts]))
  for (const c of onchain) if (!byName.has(c.alias)) byName.set(c.alias, 0)
  const merged = [...byName.entries()].map(([name, pts]) => ({ name, pts })).sort((a, b) => b.pts - a.pts)
  return NextResponse.json({
    room,
    shared: kvLive || onchain.length > 0,
    onchainShared: commitEnabled(),
    board: merged,
    onchain,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const room = clean(body.room || 'final')
  const name = clean(body.name || '')
  const pts = Math.max(0, Math.min(100000, Math.round(Number(body.pts) || 0)))
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  await submitScore(room, name, pts)
  return NextResponse.json({ room, shared: kvLive, board: await leaderboard(room) })
}
