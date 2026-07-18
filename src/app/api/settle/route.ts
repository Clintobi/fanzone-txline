import { NextRequest, NextResponse } from 'next/server'
import { settlementProof } from '@/lib/txline-server'
import { TXLINE_ORACLE_PROGRAM, explorerAddr } from '@/lib/solana'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET ?fixture=<id> -> settle the fixture's scoreline against TxLINE's on-chain
// Merkle proof. Returns the anchored root + a link to the oracle program so the
// result is verifiable, not just asserted.
export async function GET(req: NextRequest) {
  const fixtureId = Number(req.nextUrl.searchParams.get('fixture') || 0)
  if (!fixtureId) return NextResponse.json({ error: 'fixture required' }, { status: 400 })
  const s = await settlementProof(fixtureId)
  return NextResponse.json({
    ...s,
    program: TXLINE_ORACLE_PROGRAM,
    programExplorer: explorerAddr(TXLINE_ORACLE_PROGRAM),
  })
}
