import { SweepstakeRoom } from '@/components/SweepstakeRoom'

export default function Home() {
  return (
    <div className="min-h-screen bg-paper-950 text-ink">
      <header className="sticky top-0 z-40 border-b rule bg-paper-950/85 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <a href="/" className="flex items-baseline gap-2.5">
            <span className="font-display text-xl font-semibold tracking-tight">Fan&nbsp;Zone</span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-ink-faint font-mono">Sweepstake</span>
          </a>
          <span className="text-[11px] text-ink-mute font-mono">TxLINE<span className="text-ink-faint"> · live</span></span>
        </div>
      </header>

      <section className="border-b rule">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
          <div className="flex items-center gap-2.5 mb-8 text-[11px] font-mono uppercase tracking-[0.22em] text-ink-mute">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-pitch-400 opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pitch-400" />
            </span>
            Live win-probability · World Cup
          </div>
          <h1 className="font-display font-medium tracking-[-0.03em] leading-[0.94] text-balance text-[clamp(2.75rem,8.5vw,5.5rem)] max-w-4xl">
            Call the Final.<br />
            <span className="italic">Bring your group.</span>
          </h1>
          <p className="mt-8 max-w-xl text-ink-mute text-[15px] leading-relaxed text-pretty">
            Spin up a sweepstake room and call the score against a live win-probability bar on
            TxLINE&apos;s real odds. Every call is <span className="text-ink">locked on Solana before kickoff</span> and
            settled from <span className="text-ink">TxLINE&apos;s on-chain proof</span> — a shared, provably-fair
            leaderboard your whole group plays in. No wallet needed.
          </p>
        </div>
      </section>

      <SweepstakeRoom />

      <footer className="border-t rule mt-16">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-faint font-mono uppercase tracking-[0.2em]">
          <span className="text-ink-mute">Fan Zone</span>
          <span>Solana · TxLINE</span>
        </div>
      </footer>
    </div>
  )
}
