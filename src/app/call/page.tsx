import type { Metadata } from 'next'
import Link from 'next/link'

// Public landing for a shared call. Its OG image is the personalized /api/card,
// so pasting this link into X/iMessage/WhatsApp unfurls "<alias> called <pick> ·
// verified on-chain" and taps through into the room — the no-wallet viral loop.

type SP = { by?: string; pick?: string; fx?: string; sc?: string; v?: string; room?: string; tx?: string }

function cardUrl(sp: SP) {
  const q = new URLSearchParams()
  for (const k of ['by', 'pick', 'fx', 'sc', 'v'] as const) if (sp[k]) q.set(k, String(sp[k]))
  return `/api/card?${q.toString()}`
}

export function generateMetadata({ searchParams }: { searchParams: SP }): Metadata {
  const by = searchParams.by || 'A fan'
  const pick = searchParams.pick || 'their pick'
  const fx = searchParams.fx || 'the Final'
  const title = `${by} called ${pick} — ${fx}`
  const description = 'Locked on-chain before kickoff, settled from TxLINE data. Call the Final, bring your group.'
  const img = cardUrl(searchParams)
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: img, width: 1200, height: 630 }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [img] },
  }
}

export default function CallPage({ searchParams }: { searchParams: SP }) {
  const by = searchParams.by || 'A fan'
  const pick = searchParams.pick || 'their pick'
  const fx = searchParams.fx || 'the Final'
  const room = (searchParams.room || 'final').slice(0, 24)
  const tx = searchParams.tx
  const cluster = 'devnet'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-pitch-950 border border-pitch-800 text-pitch-300 mb-6">
          🔒 locked on-chain before kickoff
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">{by} called it.</h1>
        <p className="text-slate-400 mb-1">
          <span className="text-pitch-300 font-semibold">{pick}</span> — {fx}
        </p>
        <p className="text-xs text-slate-600 mb-6">Think you can call it better? Make your pick in the same room.</p>
        <Link href={`/?room=${encodeURIComponent(room)}`}
          className="inline-block w-full py-3 rounded-xl bg-pitch-600 hover:bg-pitch-700 text-white text-sm font-semibold">
          Make your call in room “{room}” →
        </Link>
        {tx && (
          <a href={`https://explorer.solana.com/tx/${tx}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer"
            className="block mt-4 text-xs text-slate-500 hover:text-pitch-300">
            view the on-chain commitment ↗
          </a>
        )}
      </div>
      <p className="mt-6 text-xs text-slate-600">
        <Link href="/" className="hover:text-slate-400">Fan Zone</Link> · live win-probability from TxLINE · provably fair on Solana
      </p>
    </div>
  )
}
