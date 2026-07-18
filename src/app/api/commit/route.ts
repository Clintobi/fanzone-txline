import { NextRequest, NextResponse } from 'next/server'
import { commitMemo, commitEnabled } from '@/lib/solana'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const clean = (s: string, n = 32) => (s || '').slice(0, n).replace(/[|\n\r]/g, ' ').replace(/[^\w .\-🇦-🇿]/gu, '').trim()

// POST { room, alias, fixture, pick, exact } -> writes a Solana devnet Memo so the
// locked call is timestamped on-chain before kickoff. Returns { enabled:false }
// (200) when no signer is configured, so the UI degrades gracefully.
export async function GET() {
  return NextResponse.json({ enabled: commitEnabled() })
}

export async function POST(req: NextRequest) {
  if (!commitEnabled()) return NextResponse.json({ enabled: false })
  const b = await req.json().catch(() => ({}))
  const room = clean(b.room || 'final', 24)
  const alias = clean(b.alias || '', 24)
  const fixture = clean(b.fixture || '', 40)
  const pick = clean(b.pick || '', 24)
  const exact = clean(b.exact || '', 8)
  // optional: a Privy embedded-wallet address that OWNS this call (base58)
  const owner = (b.owner || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 44)
  if (!alias || !pick) return NextResponse.json({ error: 'alias and pick required' }, { status: 400 })

  const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const payload = `Fan Zone call | room=${room} | ${alias} calls ${fixture}: ${pick}${exact ? ` (${exact})` : ''} | locked ${stamp}${owner ? ` | owner=${owner}` : ''}`
  try {
    const res = await commitMemo(payload)
    return NextResponse.json(res)
  } catch (e: any) {
    return NextResponse.json({ enabled: true, error: String(e?.message || e) }, { status: 502 })
  }
}
