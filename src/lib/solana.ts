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

export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`
export const explorerAddr = (a: string) => `https://explorer.solana.com/address/${a}?cluster=${CLUSTER}`

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
