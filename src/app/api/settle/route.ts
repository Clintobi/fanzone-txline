import { NextRequest, NextResponse } from 'next/server'
import { settlementProof } from '@/lib/txline-server'
import { TXLINE_ORACLE_PROGRAM, explorerAddr } from '@/lib/solana'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET ?fixture=<id> -> fetch TxLINE's stat-validation Merkle root for the fixture's
// scoreline (the same value TxODDS anchors on-chain) + a link to the oracle program,
// so the result is tied to TxODDS's own attestation, not just asserted by this app.
// NOTE: this reads the root from TxLINE's validation API; it does not itself run the
// on-chain validate_stat CPI — the copy is careful to say exactly that.
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
