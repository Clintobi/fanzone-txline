import { LiveMatchCenter } from '@/components/LiveMatchCenter'

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
            Live scores from TxLINE — updates the instant they happen
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            The World Cup, in your hand.
          </h2>
          <p className="text-slate-400 max-w-2xl">
            Follow every match live, call the winner before kickoff, build a streak, and
            climb the leaderboard against other fans — powered by TxLINE&apos;s real-time feed.
          </p>
        </div>
      </section>

      <LiveMatchCenter />

      <footer className="border-t border-slate-800 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-600 flex flex-wrap justify-between gap-2">
          <span className="text-pitch-400 font-semibold">Fan Zone</span>
          <span>Powered by Solana + TxLINE</span>
        </div>
      </footer>
    </div>
  )
}
