import { SweepstakeRoom } from '@/components/SweepstakeRoom'

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b rule bg-bg/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/" className="flex items-baseline gap-2.5 group">
            <span className="font-display font-black text-[19px] tracking-[-0.02em] leading-none">FAN&nbsp;ZONE</span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-ink-faint font-mono group-hover:text-ink-mute transition-colors">Sweepstake</span>
          </a>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-mute">
            <span className="relative flex h-1.5 w-1.5">
              <span className="fz-ping absolute inline-flex h-full w-full rounded-full bg-accent" />
              <span className="fz-live-dot relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            TxLINE<span className="text-ink-faint">·LIVE</span>
          </span>
        </div>
      </header>

      <SweepstakeRoom />

      <footer className="border-t rule mt-20">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="font-display font-black text-2xl tracking-[-0.02em] leading-none">FAN ZONE</div>
            <p className="mt-3 text-sm text-ink-mute max-w-sm text-pretty">
              A no-wallet World Cup sweepstake room. Call the score, climb a shared board — every
              call locked on Solana, settled from TxLINE&apos;s on-chain proof.
            </p>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">Solana · TxLINE</span>
        </div>
      </footer>
    </div>
  )
}
