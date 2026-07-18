import {
  ACTIONS_CORS_HEADERS, createPostResponse,
  type ActionGetResponse, type ActionPostRequest, type ActionPostResponse,
} from '@solana/actions'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
const RPC = process.env.FZ_DEVNET_RPC || 'https://api.devnet.solana.com'

// "Call the Final" as a Solana Action → shareable Blink that unfurls in X for
// wallet users. The user signs a Memo commit with THEIR OWN wallet (self-owned,
// unlike the app's no-wallet server-custodial path). App stays wallet-free; this
// is the crypto-native distribution layer.

async function featured(origin: string): Promise<{ id: number; p1: string; p2: string }> {
  try {
    const r = await fetch(`${origin}/api/txline/featured`, { cache: 'no-store' })
    const d = await r.json()
    const fx = (d.fixtures || []).find((f: any) => f.FixtureId === d.featuredId) || d.fixtures?.[0]
    if (fx) return { id: fx.FixtureId, p1: fx.Participant1, p2: fx.Participant2 }
  } catch {}
  return { id: 18257865, p1: 'France', p2: 'England' }
}

export const OPTIONS = async () => new Response(null, { headers: ACTIONS_CORS_HEADERS })

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin
  const f = await featured(origin)
  const base = `${origin}/api/actions/call?fixture=${encodeURIComponent(`${f.p1} v ${f.p2}`)}`
  const body: ActionGetResponse = {
    type: 'action',
    icon: `${origin}/api/card?by=You&pick=Your+Call&fx=${encodeURIComponent(`${f.p1} v ${f.p2}`)}&v=locked`,
    title: `⚽ Call it: ${f.p1} v ${f.p2}`,
    description: 'Lock your World Cup call on-chain before kickoff — provably fair, settled from TxLINE data. Then climb the Fan Zone sweepstake board.',
    label: 'Call it',
    links: {
      actions: [
        { type: 'transaction', label: f.p1, href: `${base}&pick=${encodeURIComponent(f.p1)}` },
        { type: 'transaction', label: 'Draw', href: `${base}&pick=Draw` },
        { type: 'transaction', label: f.p2, href: `${base}&pick=${encodeURIComponent(f.p2)}` },
      ],
    },
  }
  return Response.json(body, { headers: ACTIONS_CORS_HEADERS })
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const pick = (url.searchParams.get('pick') || 'my pick').slice(0, 24)
  const fixture = (url.searchParams.get('fixture') || 'the Final').slice(0, 48)
  const body: ActionPostRequest = await req.json()

  let account: PublicKey
  try { account = new PublicKey(body.account) }
  catch { return Response.json({ message: 'Invalid account' }, { status: 400, headers: ACTIONS_CORS_HEADERS }) }

  const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const memo = `Fan Zone call | ${pick} — ${fixture} | locked ${stamp}`

  const conn = new Connection(RPC, 'confirmed')
  const tx = new Transaction().add(new TransactionInstruction({
    keys: [{ pubkey: account, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM,
    data: Buffer.from(memo, 'utf8'),
  }))
  tx.feePayer = account
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash

  const payload: ActionPostResponse = await createPostResponse({
    fields: {
      type: 'transaction',
      transaction: tx,
      message: `You called ${pick} for ${fixture}. Locked on-chain — play the sweepstake at fanzone-txline.vercel.app`,
    },
  })
  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS })
}
