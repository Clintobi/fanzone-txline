import { SweepstakeRoom } from '@/components/SweepstakeRoom'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pitch-400 to-pitch-600 flex items-center justify-center text-sm font-bold text-white">FZ</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Fan Zone</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Live World Cup</p>
            </div>
          </div>
          <div className="text-xs text-slate-500"><span className="text-pitch-400 font-mono">TxLINE</span> powered</div>
        </div>
      </header>

      <section className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pitch-950 border border-pitch-800 text-pitch-300 text-xs mb-5">
            <span className="w-2 h-2 rounded-full bg-pitch-400 animate-pulse" />
            Final Sweepstake — live win-probability from TxLINE odds
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-[-0.035em] leading-[1.03] mb-3 text-balance">
            Call the Final. Bring your group.
          </h2>
          <p className="text-slate-400 max-w-2xl">
            Spin up a sweepstake room, call the score, and watch the win-probability bar swing on
            every real goal — a shared leaderboard your whole group plays in, powered by TxLINE&apos;s
            live odds and scores.
          </p>
        </div>
      </section>

      <SweepstakeRoom />

      <footer className="border-t border-slate-800 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-600 flex flex-wrap justify-between gap-2">
          <span className="text-pitch-400 font-semibold">Fan Zone</span>
          <span>Powered by Solana + TxLINE</span>
        </div>
      </footer>
    </div>
  )
}
