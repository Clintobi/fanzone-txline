import 'server-only'
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  sendAndConfirmTransaction, LAMPORTS_PER_SOL,
} from '@solana/web3.js'

// Server-custodial Solana signer for Fan Zone's on-chain "called-it" commits.
// Fans never need a wallet: when a prediction is locked, the server writes a
// small Memo transaction on Solana devnet so the call is timestamped on-chain
// BEFORE kickoff and can't be edited after. This is a real, finalized devnet tx
// (not a hash we invent) — disclosed in the UI as a devnet commitment.

const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
// TxLINE's on-chain oracle program (whose Merkle roots settle the results).
export const TXLINE_ORACLE_PROGRAM = '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J'
export const CLUSTER = 'devnet'
const RPC = process.env.FZ_DEVNET_RPC || 'https://api.devnet.solana.com'

// Solscan renders devnet txs reliably (explorer.solana.com's devnet RPC often
// hangs on "Loading") and labels the Memo instruction clearly — better for proof links.
export const explorerTx = (sig: string) => `https://solscan.io/tx/${sig}?cluster=${CLUSTER}`
export const explorerAddr = (a: string) => `https://solscan.io/account/${a}?cluster=${CLUSTER}`

let signer: Keypair | null | undefined // undefined = not yet loaded, null = not configured
function loadSigner(): Keypair | null {
  if (signer !== undefined) return signer
  const raw = (process.env.FZ_DEVNET_SECRET || '').trim()
  if (!raw) { signer = null; return null }
  try {
    if (raw.startsWith('[')) {
      signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
    } else {
      // base58 secret key
      const bs58 = require('bs58')
      signer = Keypair.fromSecretKey(bs58.decode(raw))
    }
    return signer
  } catch {
    signer = null
    return null
  }
}

export function commitEnabled(): boolean {
  return loadSigner() !== null
}

let conn: Connection | null = null
function connection(): Connection {
  if (!conn) conn = new Connection(RPC, 'confirmed')
  return conn
}

export type CommitResult =
  | { enabled: false }
  | { enabled: true; signature: string; cluster: string; explorer: string; signerPubkey: string }

// Write a Memo commit for a locked prediction. Returns { enabled:false } when no
// signer is configured so the client can hide the feature gracefully.
export async function commitMemo(payload: string): Promise<CommitResult> {
  const kp = loadSigner()
  if (!kp) return { enabled: false }
  const data = Buffer.from(payload.slice(0, 512), 'utf8')
  const tx = new Transaction().add(new TransactionInstruction({
    keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM,
    data,
  }))
  const signature = await sendAndConfirmTransaction(connection(), tx, [kp], {
    commitment: 'confirmed', maxRetries: 3,
  })
  return { enabled: true, signature, cluster: CLUSTER, explorer: explorerTx(signature), signerPubkey: kp.publicKey.toBase58() }
}

// Best-effort signer balance (for an ops/health check).
export async function signerBalanceSol(): Promise<number | null> {
  const kp = loadSigner()
  if (!kp) return null
  try { return (await connection().getBalance(kp.publicKey)) / LAMPORTS_PER_SOL } catch { return null }
}

// --- read the room's calls back OFF-CHAIN-FREE, straight from Solana -----------
// The leaderboard is genuinely shared across devices with no database: every call
// is a Memo tx from the signer, so we reconstruct a room by reading the signer's
// transactions and parsing the memos. No KV, no account — the board IS on-chain.

export type OnChainCall = { alias: string; pick: string; fixture: string; signature: string }
const callsCache = new Map<string, { at: number; calls: OnChainCall[] }>()
const CALLS_TTL = 12_000

export async function roomCallsOnChain(room: string, limit = 40): Promise<OnChainCall[]> {
  const kp = loadSigner()
  if (!kp) return []
  const hit = callsCache.get(room)
  if (hit && Date.now() - hit.at < CALLS_TTL) return hit.calls
  try {
    const sigs = await connection().getSignaturesForAddress(kp.publicKey, { limit })
    if (!sigs.length) return []
    const txs = await connection().getParsedTransactions(sigs.map(s => s.signature), { maxSupportedTransactionVersion: 0 })
    const seen = new Set<string>()
    const calls: OnChainCall[] = []
    txs.forEach((t, i) => {
      const logs = (t?.meta?.logMessages || []).join(' ')
      const m = logs.match(/Memo \(len \d+\): "(.*?)"/)
      if (!m) return
      // Fan Zone call | room=final | <alias> calls <fixture>: <pick>(exact) | locked ...
      const p = m[1].match(/room=([^|]+?)\s*\|\s*(.+?) calls (.+?): ([^|]+?)(?:\s*\||$)/)
      if (!p) return
      if (p[1].trim() !== room) return
      const alias = p[2].trim().slice(0, 24)
      if (seen.has(alias)) return // latest call per alias wins (sigs are newest-first)
      seen.add(alias)
      calls.push({ alias, fixture: p[3].trim(), pick: p[4].replace(/\s*\(.*\)\s*/, '').trim(), signature: sigs[i].signature })
    })
    callsCache.set(room, { at: Date.now(), calls })
    return calls
  } catch {
    return hit?.calls ?? []
  }
}
