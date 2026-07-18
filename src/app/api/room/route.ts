import { NextRequest, NextResponse } from 'next/server'
import { submitScore, leaderboard, kvLive } from '@/lib/kv'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const clean = (s: string) => (s || '').slice(0, 24).replace(/[^\w .\-]/g, '').trim()

export async function GET(req: NextRequest) {
  const room = clean(req.nextUrl.searchParams.get('room') || 'final')
  return NextResponse.json({ room, shared: kvLive, board: await leaderboard(room) })
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
