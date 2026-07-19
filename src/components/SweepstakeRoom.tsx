'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { txline, readScore, readOdds, type Fixture, type Score, type Odds } from '@/lib/txline'
import { usePrivyBridge, PrivySignIn } from '@/components/privy'

type Pick = 'home' | 'draw' | 'away'

// team → 3-letter code + dominant flag hue (rgb) for the hexagon badge + card tint.
// No emoji, no external assets — a robust broadcast-grade badge.
const CODE: Record<string, string> = {
  France: 'FRA', England: 'ENG', Spain: 'ESP', Argentina: 'ARG', Brazil: 'BRA',
  Australia: 'AUS', Vietnam: 'VIE', Myanmar: 'MYA', 'New Zealand': 'NZL', India: 'IND',
  Liechtenstein: 'LIE', Gibraltar: 'GIB',
}
const TINT: Record<string, string> = {
  France: '56,110,240', England: '220,60,60', Spain: '214,52,52', Argentina: '92,164,232',
  Brazil: '34,197,94', Australia: '234,179,8', Vietnam: '218,41,28', Myanmar: '234,179,8',
  'New Zealand': '52,110,235', India: '255,140,40', Liechtenstein: '52,110,235', Gibraltar: '218,41,28',
}
const code = (t: string) => CODE[t] || t.slice(0, 3).toUpperCase()
const tint = (t: string) => TINT[t] || '160,168,180'

const PICK_PTS = 100, EXACT_BONUS = 150
const EMPTY_SCORE: Score = { h: 0, a: 0, status: 'Awaiting kickoff', live: false, finished: false, seq: 0 }

// hexagon flag badge — the one consistent way a team is ever shown
function FlagBadge({ team, size = 'lg' }: { team: string; size?: 'lg' | 'sm' }) {
  const rgb = tint(team)
  const dim = size === 'lg' ? 'w-12 h-12 sm:w-[58px] sm:h-[58px]' : 'w-8 h-8'
  const txt = size === 'lg' ? 'text-[13px] sm:text-[15px]' : 'text-[9px]'
  return (
    <span className={`relative inline-block ${dim} shrink-0`} title={team} aria-label={team}>
      {/* metallic rim */}
      <span className="hex absolute inset-0" style={{ background: 'linear-gradient(155deg, rgba(255,255,255,0.34), rgba(255,255,255,0.05) 42%, rgba(0,0,0,0.28))' }} />
      <span className="hex absolute inset-[1.5px] flex items-center justify-center"
        style={{ background: `radial-gradient(120% 120% at 50% 8%, rgba(${rgb},0.58), rgba(${rgb},0.17) 52%, #0d0f14 100%)` }}>
        <span className={`font-display font-black text-ink tracking-[-0.01em] ${txt} drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]`}>{code(team)}</span>
      </span>
    </span>
  )
}

// eased count-up so numbers tick rather than jump — the "live product" feel
function useCountUp(target: number, ms = 600) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = from.current, delta = target - start
    if (delta === 0) return
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(start + delta * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
const AnimatedPct = ({ value }: { value: number }) => <>{Math.round(useCountUp(value * 100))}%</>
const AnimatedInt = ({ value }: { value: number }) => <>{Math.round(useCountUp(value))}</>

export function SweepstakeRoom() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [sel, setSel] = useState<Fixture | null>(null)
  const [score, setScore] = useState<Score>(EMPTY_SCORE)
  const [odds, setOdds] = useState<Odds | null>(null)
  const [featuredId, setFeaturedId] = useState<number | null>(null)
  const [room, setRoom] = useState('final')
  const [shared, setShared] = useState(false)
  const [board, setBoard] = useState<{ name: string; pts: number }[]>([])
  const [name, setName] = useState('')
  const [pick, setPick] = useState<Pick | null>(null)
  const [exact, setExact] = useState('')
  const [locked, setLocked] = useState<{ pick: Pick; exact?: [number, number] } | null>(null)
  const [copied, setCopied] = useState(false)
  const [chainOn, setChainOn] = useState(false)
  const [commit, setCommit] = useState<{ pending?: boolean; signature?: string; explorer?: string } | null>(null)
  const [settle, setSettle] = useState<{ verified: boolean; root?: string; seq?: number; programExplorer?: string; detail?: string } | null>(null)
  const [streak, setStreak] = useState(0)
  const [callCopied, setCallCopied] = useState(false)
  const [onchainShared, setOnchainShared] = useState(false)
  const [onchainCalls, setOnchainCalls] = useState<{ alias: string; pick: string; signature: string }[]>([])
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)
  const privy = usePrivyBridge() // null unless NEXT_PUBLIC_PRIVY_APP_ID is set

  // is the on-chain commit signer configured on this deploy?
  useEffect(() => {
    fetch('/api/commit').then(r => r.json()).then(d => setChainOn(!!d.enabled)).catch(() => {})
  }, [])

  // correct-call streak (persisted locally) — the cheap, high-retention mechanic
  useEffect(() => { try { setStreak(Number(localStorage.getItem('fz_streak') || 0)) } catch {} }, [])

  // room id + identity from URL / storage
  useEffect(() => {
    const url = new URL(window.location.href)
    setRoom((url.searchParams.get('room') || 'final').slice(0, 24))
    try { setName(localStorage.getItem('fz_name') || '') } catch {}
  }, [])

  // fixtures + featured match — the server scans odds/scores and hands us the
  // liveliest real match, so the flagship win-prob bar is never a flat placeholder.
  useEffect(() => {
    (async () => {
      try {
        const f = await txline.getFeatured()
        setFixtures(f.fixtures)
        setFeaturedId(f.featuredId)
        setSel(f.fixtures.find(x => x.FixtureId === f.featuredId) || f.fixtures[0] || null)
        setScore(f.score || EMPTY_SCORE)
        setOdds(f.odds)
      } catch {
        // hard fallback: plain fixtures, default to latest-scheduled
        try {
          const fx = await txline.getFixtures()
          setFixtures(fx)
          setSel([...fx].sort((a, b) => +new Date(b.StartTime) - +new Date(a.StartTime))[0] || null)
        } catch {}
      }
    })()
  }, [])

  const loadBoard = useCallback(async (r: string) => {
    try {
      const d = await (await fetch(`/api/room?room=${encodeURIComponent(r)}`)).json()
      setBoard(d.board || []); setShared(!!d.shared); setOnchainShared(!!d.onchainShared); setOnchainCalls(d.onchain || [])
    } catch {}
  }, [])
  useEffect(() => { if (room) loadBoard(room) }, [room, loadBoard])

  // poll live score + odds for the selected match
  useEffect(() => {
    if (!sel) return
    if (poll.current) clearInterval(poll.current)
    const tick = async () => {
      try {
        const [scoreRows, oddsRows] = await Promise.all([txline.getScoresSnapshot(sel.FixtureId), txline.getOddsSnapshot(sel.FixtureId)])
        const s = readScore(scoreRows)
        const o = readOdds(oddsRows)
        setScore(s)
        // keep the last real odds if a poll momentarily returns none for a live match
        setOdds(prev => o ?? (s.finished ? null : prev))
      } catch {}
    }
    tick(); poll.current = setInterval(tick, 8000)
    return () => { if (poll.current) clearInterval(poll.current) }
  }, [sel])

  const grade = useCallback((lk: { pick: Pick; exact?: [number, number] }) => {
    if (!score.finished) return 0
    const actual: Pick = score.h > score.a ? 'home' : score.h < score.a ? 'away' : 'draw'
    let pts = lk.pick === actual ? PICK_PTS : 0
    if (pts && lk.exact && lk.exact[0] === score.h && lk.exact[1] === score.a) pts += EXACT_BONUS
    return pts
  }, [score])

  async function lockIn() {
    if (!pick || !name.trim()) return
    const m = exact.match(/^(\d+)\s*[-:]\s*(\d+)$/)
    const lk = { pick, exact: m ? [Number(m[1]), Number(m[2])] as [number, number] : undefined }
    setLocked(lk)
    try { localStorage.setItem('fz_name', name.trim()) } catch {}
    const pts = grade(lk)
    try {
      const d = await (await fetch('/api/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, name: name.trim(), pts }) })).json()
      setBoard(d.board || []); setShared(!!d.shared)
    } catch {}
    // stamp the call on-chain (Solana devnet) so it's timestamped before kickoff
    if (chainOn && sel) {
      setCommit({ pending: true })
      const pickLabel = lk.pick === 'home' ? sel.Participant1 : lk.pick === 'away' ? sel.Participant2 : 'Draw'
      try {
        const c = await (await fetch('/api/commit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room, alias: name.trim(), fixture: `${sel.Participant1} v ${sel.Participant2}`, pick: pickLabel, exact: lk.exact ? `${lk.exact[0]}-${lk.exact[1]}` : '', owner: privy?.address || '' }),
        })).json()
        setCommit(c?.signature ? { signature: c.signature, explorer: c.explorer } : null)
      } catch { setCommit(null) }
    }
  }

  // when the match finishes, re-grade a pending pick, update streak, push result
  useEffect(() => {
    if (locked && score.finished && name.trim()) {
      const pts = grade(locked)
      setStreak(s => { const n = pts > 0 ? s + 1 : 0; try { localStorage.setItem('fz_streak', String(n)) } catch {} ; return n })
      fetch('/api/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, name: name.trim(), pts }) })
        .then(r => r.json()).then(d => { setBoard(d.board || []); setShared(!!d.shared) }).catch(() => {})
    }
  }, [score.finished]) // eslint-disable-line react-hooks/exhaustive-deps

  // build + share a personalized "I called it" link (unfurls the /api/card OG image)
  function shareCall() {
    if (!locked || !sel) return
    const pickLabel = locked.pick === 'home' ? sel.Participant1 : locked.pick === 'away' ? sel.Participant2 : 'Draw'
    const v = score.finished ? (grade(locked) > 0 ? 'won' : 'lost') : 'locked'
    const q = new URLSearchParams({ by: name.trim() || 'A fan', pick: pickLabel, fx: `${sel.Participant1} v ${sel.Participant2}`, room, v })
    if (locked.exact) q.set('sc', `${locked.exact[0]}-${locked.exact[1]}`)
    if (commit?.signature) q.set('tx', commit.signature)
    const url = `${window.location.origin}/call?${q.toString()}`
    const text = `I called ${pickLabel} in the World Cup Final Sweepstake — locked on-chain before kickoff. Beat my call:`
    if (navigator.share) { navigator.share({ title: 'Fan Zone — my call', text, url }).catch(() => {}) }
    else { navigator.clipboard?.writeText(url); setCallCopied(true); setTimeout(() => setCallCopied(false), 1600) }
  }

  // when the featured match is finished, verify its result against TxLINE's on-chain proof
  useEffect(() => {
    if (sel && score.finished) {
      fetch(`/api/settle?fixture=${sel.FixtureId}`).then(r => r.json()).then(setSettle).catch(() => {})
    } else { setSettle(null) }
  }, [sel, score.finished])

  const shareLink = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room)}` : ''), [room])
  function share() {
    const text = `Join my World Cup Final Sweepstake room "${room}" — call the score, climb the board.`
    if (navigator.share) { navigator.share({ title: 'Fan Zone Sweepstake', text, url: shareLink }).catch(() => {}) }
    else { navigator.clipboard?.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }

  const actualLabel = score.finished ? (score.h > score.a ? 'home' : score.h < score.a ? 'away' : 'draw') : null
  const isFeatured = sel != null && sel.FixtureId === featuredId

  // win-probability, resolved to a leading side for the big broadcast number
  const probRows = sel && odds ? ([
    { k: 'home', lbl: sel.Participant1, v: odds.home },
    { k: 'draw', lbl: 'Draw', v: odds.draw },
    { k: 'away', lbl: sel.Participant2, v: odds.away },
  ]) : []
  const lead = probRows.length ? probRows.reduce((a, b) => (b.v > a.v ? b : a)) : null
  const kickoff = sel ? new Date(sel.StartTime).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="max-w-6xl mx-auto px-5">

      {/* ─────────── HERO ─────────── */}
      <section className="grid lg:grid-cols-[1.06fr_minmax(0,0.94fr)] gap-10 lg:gap-12 items-center pt-12 pb-14 lg:pt-16 lg:pb-16">
        <div>
          <div className="flex items-center gap-2 mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mute">
            <span className="relative flex h-1.5 w-1.5">
              <span className="fz-ping absolute inline-flex h-full w-full rounded-full bg-accent" />
              <span className="fz-live-dot relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Live win-probability · World Cup
          </div>
          <h1 className="font-display font-black text-ink leading-[0.88] tracking-[-0.03em] text-[clamp(2.1rem,5.4vw,3.95rem)]" style={{ fontStretch: '106%' }}>
            <span className="block whitespace-nowrap">Call the Final.</span>
            <span className="block whitespace-nowrap">Bring your group.</span>
          </h1>
          <p className="mt-6 max-w-md text-ink-mute text-[17px] leading-relaxed text-pretty">
            Spin up a sweepstake room and call the score against a live win-probability bar on
            TxLINE&apos;s real odds. Every call is locked on Solana before kickoff and settled from
            TxLINE&apos;s on-chain proof. No wallet needed.
          </p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <a href="#call" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[14px] bg-accent text-accent-ink font-bold text-sm hover:bg-accent-400 hover:-translate-y-0.5 transition-all">
              Make your call <span aria-hidden className="translate-y-px">↓</span>
            </a>
            <button onClick={share} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[14px] border rule text-ink-soft hover:text-ink hover:rule-strong transition text-sm">
              {copied ? 'Link copied ✓' : 'Invite your group ↗'}
            </button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            <span>Solana devnet</span>
            <span className="text-line-strong" aria-hidden>/</span>
            <span>TxLINE odds</span>
            <span className="text-line-strong" aria-hidden>/</span>
            <span>No wallet</span>
          </div>
        </div>

        {/* THE LIVE MATCH TICKET — the signature element */}
        <div className="relative min-w-0">
          <div aria-hidden className="pointer-events-none absolute -inset-10 -z-0"
            style={{ background: 'radial-gradient(closest-side at 70% 34%, rgba(62,233,127,0.13), transparent 72%)' }} />
          <div className="relative">
          {!sel ? (
            <div className="rounded-[22px] border rule bg-surface p-5 sm:p-6 animate-pulse">
              <div className="h-2.5 w-28 bg-white/5 rounded mb-8" />
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                <div className="flex flex-col items-center gap-2.5"><div className="w-14 h-14 hex bg-white/5" /><div className="h-2 w-12 bg-white/5 rounded" /></div>
                <div className="h-20 w-full bg-white/5 rounded-xl" />
                <div className="flex flex-col items-center gap-2.5"><div className="w-14 h-14 hex bg-white/5" /><div className="h-2 w-12 bg-white/5 rounded" /></div>
              </div>
              <div className="h-2.5 rounded-full bg-white/5 mt-8" />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint mt-4">Scanning TxLINE for the liveliest match…</p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[22px] border rule bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.06)]">
              {/* team-tinted radial glows, one per half */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-y-0 left-0 w-1/2" style={{ background: `radial-gradient(130% 92% at 18% -8%, rgba(${tint(sel.Participant1)},0.20), transparent 68%)` }} />
                <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: `radial-gradient(130% 92% at 82% -8%, rgba(${tint(sel.Participant2)},0.20), transparent 68%)` }} />
              </div>

              <div className="relative p-5 sm:p-7">
                {/* status row */}
                <div className="flex items-center justify-between gap-2 mb-7">
                  <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                    {score.live ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="fz-ping absolute inline-flex h-full w-full rounded-full bg-live" />
                          <span className="fz-live-dot relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
                        </span>
                        <span className="text-live font-semibold">Live</span>
                        <span className="text-ink-faint">·</span>
                        <span className="text-ink-mute normal-case tracking-normal">{score.status}</span>
                      </>
                    ) : (
                      <span className="text-ink-mute normal-case tracking-normal">{score.status}</span>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    {isFeatured && <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.16em] text-accent-400/90">✦ liveliest</span>}
                    {fixtures.length > 1 && (
                      <select value={sel.FixtureId} onChange={e => setSel(fixtures.find(f => f.FixtureId === Number(e.target.value)) || sel)}
                        className="text-[11px] bg-surface-2 border rule rounded-lg px-2 py-1 text-ink-mute outline-none focus:rule-strong cursor-pointer hover:text-ink-soft transition-colors">
                        {fixtures.map(f => <option key={f.FixtureId} value={f.FixtureId} className="bg-surface">{f.Participant1} v {f.Participant2}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                {/* scoreline */}
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
                  <div className="flex flex-col items-center gap-2.5">
                    <FlagBadge team={sel.Participant1} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft text-center max-w-[76px] truncate">{sel.Participant1}</span>
                  </div>
                  <div className="min-w-0 px-1 font-display font-extrabold tnum leading-[0.82] tracking-[-0.04em] text-center text-[clamp(3rem,8vw,5rem)] flex items-center justify-center gap-1.5 sm:gap-2.5">
                    <AnimatedInt value={score.h} /><span className="text-ink-faint font-normal">–</span><AnimatedInt value={score.a} />
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <FlagBadge team={sel.Participant2} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft text-center max-w-[76px] truncate">{sel.Participant2}</span>
                  </div>
                </div>

                {/* win-probability — momentum split */}
                <div className="mt-7 pt-5 border-t rule">
                  <div className="flex items-end justify-between mb-3 gap-3">
                    {lead ? (
                      <span className="flex items-baseline gap-2 min-w-0">
                        <span className="font-display font-extrabold tnum text-ink text-[clamp(1.7rem,5vw,2.4rem)] leading-none">
                          <AnimatedPct value={lead.v} />
                        </span>
                        <span className="text-[13px] text-ink-mute truncate">{lead.k === 'draw' ? 'draw likeliest' : `${lead.lbl} to win`}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">Win probability</span>
                    )}
                    <span className={`font-mono text-[10px] uppercase tracking-[0.14em] shrink-0 ${odds ? 'text-accent-400/90' : 'text-ink-faint'}`}>
                      {odds ? 'live · de-margined' : 'awaiting 1X2'}
                    </span>
                  </div>
                  {odds ? (
                    <>
                      <div className="h-2.5 rounded-full overflow-hidden bg-white/[0.06] flex gap-0.5">
                        <div className="bg-accent transition-all duration-700 ease-out rounded-l-full" style={{ width: `${odds.home * 100}%` }} title={`${sel.Participant1} ${(odds.home * 100).toFixed(0)}%`} />
                        <div className="bg-ink-faint transition-all duration-700 ease-out" style={{ width: `${odds.draw * 100}%` }} title={`Draw ${(odds.draw * 100).toFixed(0)}%`} />
                        <div className="bg-[#7c8598] transition-all duration-700 ease-out rounded-r-full" style={{ width: `${odds.away * 100}%` }} title={`${sel.Participant2} ${(odds.away * 100).toFixed(0)}%`} />
                      </div>
                      <div className="flex justify-between mt-2.5 font-mono text-[11px] tnum">
                        <span className="text-accent-300">{code(sel.Participant1)} <AnimatedPct value={odds.home} /></span>
                        <span className="text-ink-mute">DRAW <AnimatedPct value={odds.draw} /></span>
                        <span className="text-ink-soft">{code(sel.Participant2)} <AnimatedPct value={odds.away} /></span>
                      </div>
                    </>
                  ) : (
                    <div className="h-2.5 rounded-full bg-[repeating-linear-gradient(45deg,rgba(244,246,248,0.08),rgba(244,246,248,0.08)_7px,transparent_7px,transparent_14px)]"
                      title="TxLINE hasn't posted a 1X2 market for this fixture yet" />
                  )}
                </div>

                {/* kickoff meta — balances the ticket height + reinforces the on-chain story */}
                <div className="mt-5 pt-4 border-t rule flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                  <span className="text-ink-mute">Kickoff · {kickoff}</span>
                  <span className="text-ink-faint">Locks on-chain</span>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </section>

      {/* ─────────── ROOM BAR ─────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-y rule py-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Room</span>
          <span className="font-mono text-[12px] px-2.5 py-1 rounded-full border rule text-ink">{room}</span>
          <span className={`font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border ${shared || onchainShared ? 'border-accent-800/70 text-accent-300' : 'rule text-ink-faint'}`}
            title={onchainShared ? 'Every call is a Memo tx — the board is read straight from Solana, shared across all devices' : undefined}>
            {onchainShared ? 'shared · read from Solana' : shared ? 'shared' : 'local'}
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border border-gold/30 text-gold-soft" title="correct calls in a row">
              <Flame /> {streak} streak
            </span>
          )}
          <PrivySignIn />
        </div>
        <button onClick={share} className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-mute hover:text-ink transition">
          {copied ? 'copied ✓' : 'Invite ↗'}
        </button>
      </div>

      {/* ─────────── CALL THE RESULT ─────────── */}
      {sel && (
        <section id="call" className="scroll-mt-20 pt-14 lg:pt-20">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 mb-6">
            <h2 className="font-display font-extrabold text-ink text-[clamp(1.6rem,4vw,2.4rem)] tracking-[-0.02em] leading-none">Call the result</h2>
            {!locked && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint shrink-0">Winner {PICK_PTS} · exact +{EXACT_BONUS}</span>}
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)] gap-8 lg:gap-12 items-start">
            <div>
          {!locked ? (
            <div className="grid gap-3">
              <input value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="Your name"
                className="w-full bg-surface-2 border rule rounded-xl px-4 py-3.5 text-sm text-ink placeholder:text-ink-mute focus:rule-strong outline-none transition" />
              {/* broadcast split-pick */}
              <div className="grid grid-cols-3 gap-2">
                {(['home', 'draw', 'away'] as Pick[]).map(k => {
                  const label = k === 'home' ? sel.Participant1 : k === 'away' ? sel.Participant2 : 'Draw'
                  const on = pick === k
                  return (
                    <button key={k} onClick={() => setPick(k)}
                      className={`px-3 py-4 rounded-xl border text-sm transition-all active:scale-[0.98] ${on ? 'border-accent bg-accent text-accent-ink font-bold shadow-[0_8px_24px_-10px_rgba(62,233,127,0.6)]' : 'border-line bg-surface-2 text-ink-soft hover:text-ink hover:rule-strong'}`}>
                      <span className="block font-mono text-[9px] uppercase tracking-[0.16em] mb-1 opacity-70">{k === 'draw' ? 'Draw' : k === 'home' ? 'Home' : 'Away'}</span>
                      <span className="block truncate font-semibold">{label}</span>
                    </button>
                  )
                })}
              </div>
              <input value={exact} onChange={e => setExact(e.target.value)} placeholder="Exact score — optional, e.g. 2-1"
                className="w-full bg-surface-2 border rule rounded-xl px-4 py-3.5 text-sm text-ink placeholder:text-ink-mute focus:rule-strong outline-none transition" />
              <button onClick={lockIn} disabled={!pick || !name.trim()}
                className="w-full py-4 rounded-xl bg-accent hover:bg-accent-400 text-accent-ink text-sm font-bold tracking-wide transition-colors disabled:bg-surface-2 disabled:text-ink-faint disabled:border disabled:border-line disabled:cursor-not-allowed">
                Lock it in
              </button>
            </div>
          ) : (
            <div className="border rule rounded-2xl bg-surface px-5 sm:px-6 py-5">
              <p className="text-sm text-ink-soft leading-relaxed">
                Locked: <b className="text-ink font-semibold">{locked.pick === 'home' ? sel.Participant1 : locked.pick === 'away' ? sel.Participant2 : 'Draw'}</b>
                {locked.exact && <> · {locked.exact[0]}–{locked.exact[1]}</>}.
                {score.finished
                  ? <> Full time {score.h}–{score.a} → you {grade(locked) > 0 ? <b className="text-accent">scored {grade(locked)} pts</b> : 'missed this one'}.</>
                  : <> Come back at full time — it grades live from the TxLINE result.</>}
                {actualLabel && locked.pick !== actualLabel && <span className="text-ink-mute"> (result: {actualLabel})</span>}
              </p>
              {chainOn && (
                <div className="mt-4 text-xs">
                  {commit?.pending && <span className="inline-flex items-center gap-1.5 text-ink-mute"><Lock /> stamping your call on Solana devnet…</span>}
                  {commit?.signature && (
                    <a href={commit.explorer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-accent-300 hover:underline">
                      <Lock /> Call committed on-chain before kickoff · view proof ↗
                    </a>
                  )}
                </div>
              )}
              <button onClick={shareCall} className="mt-4 inline-flex items-center gap-1.5 text-[11px] px-3.5 py-2 rounded-full border border-accent-700/70 text-accent-200 hover:bg-accent hover:text-accent-ink hover:border-accent transition">
                {callCopied ? 'link copied ✓' : 'Share my call ↗'}
              </button>
            </div>
          )}
            </div>

            {/* how a call locks — fills the frame + reinforces the on-chain value prop */}
            <aside className="lg:pt-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint mb-5">How a call locks</div>
              <ol className="space-y-5">
                {[
                  { t: 'Call the score', d: 'Pick the winner — or the exact score for bonus points — before kickoff.' },
                  { t: 'Locked on Solana', d: 'Your call is stamped as a devnet transaction, timestamped before kickoff. No changing it after.' },
                  { t: 'Grades itself', d: 'At full time it settles from TxLINE’s on-chain result. No arguments, no scorekeeper.' },
                ].map((s, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span className="font-display font-black text-accent text-[15px] w-5 shrink-0 tnum leading-6">{i + 1}</span>
                    <div>
                      <div className="text-sm text-ink font-semibold">{s.t}</div>
                      <div className="text-[13px] text-ink-mute text-pretty mt-0.5 leading-relaxed">{s.d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>
      )}

      {/* ─────────── LEADERBOARD ─────────── */}
      <section className="pt-14 lg:pt-20">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display font-extrabold text-ink text-[clamp(1.6rem,4vw,2.4rem)] tracking-[-0.02em] leading-none">Leaderboard</h2>
          <button onClick={() => loadBoard(room)} className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink-mute transition">refresh</button>
        </div>
        {board.length === 0 ? (
          <p className="text-sm text-ink-mute max-w-md">No calls yet. Lock a prediction and share the room link to fill it up.</p>
        ) : (
          <div className="divide-y divide-white/[0.06] border-y rule">
            {board.map((r, i) => {
              const call = onchainCalls.find(c => c.alias === r.name)
              const me = r.name === name.trim()
              return (
                <div key={r.name + i} className={`flex items-center justify-between gap-3 py-3.5 px-2 -mx-2 rounded-lg transition-colors hover:bg-white/[0.02] ${me ? 'text-accent-200' : 'text-ink-soft'}`}>
                  <span className="flex items-baseline gap-3.5 min-w-0">
                    <span className={`font-display font-black tnum text-[15px] w-6 shrink-0 ${i === 0 ? 'text-gold' : 'text-ink-faint'}`}>{i + 1}</span>
                    <span className="truncate text-[15px]">
                      <span className={me ? 'font-semibold' : ''}>{r.name}</span>
                      {call && <span className="text-ink-faint font-mono text-[11px] uppercase tracking-[0.06em]"> · {call.pick}</span>}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    {call && <a href={`https://explorer.solana.com/tx/${call.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-faint hover:text-accent-300 transition" title="this call, on Solana">↗</a>}
                    <span className="font-display font-extrabold tnum text-ink text-[17px]">{r.pts}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ─────────── PROVABLY FAIR ─────────── */}
      {chainOn && (
        <section className="pt-14 lg:pt-20">
          <div className="rounded-2xl border border-accent-900/50 bg-accent-950/20 px-6 sm:px-8 py-7">
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="font-display font-extrabold text-accent-100 text-[clamp(1.4rem,3.5vw,2rem)] tracking-[-0.02em] leading-none">Provably fair</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint border rule rounded-full px-2 py-0.5">Solana devnet</span>
            </div>
            <p className="text-sm text-ink-mute leading-relaxed max-w-2xl text-pretty">
              Every call is <span className="text-ink-soft">timestamped on Solana devnet before kickoff</span> — a real
              transaction you can open in Explorer, so nobody in your room can change a pick after the fact. At full
              time the result is tied to TxLINE&apos;s stat-validation Merkle root, the exact value TxODDS anchors
              on-chain — so it isn&apos;t &ldquo;trust the app,&rdquo; it&apos;s pinned to TxODDS&apos;s own cryptographic attestation.
            </p>
            {settle && (
              <div className="mt-5 text-xs font-mono">
                {settle.verified ? (
                  <a href={settle.programExplorer} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-accent-300 hover:underline">
                    <span className="text-accent">✓</span> matched to TxLINE&apos;s anchored root · {settle.root?.slice(0, 8)}… · seq {settle.seq} · oracle program ↗
                  </a>
                ) : (
                  <span className="text-ink-faint">{settle.detail}</span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────── MONETIZATION ─────────── */}
      <section className="pt-14 lg:pt-20 pb-2">
        <div className="border-t rule pt-8 flex items-center justify-between flex-wrap gap-5">
          <div>
            <div className="font-display font-extrabold text-ink text-xl tracking-[-0.01em]">Host a branded room</div>
            <div className="text-sm text-ink-mute mt-1.5 max-w-md text-pretty">Sponsored sweepstakes, custom themes &amp; prize pools — the Sleeper model. Rooms are the product.</div>
          </div>
          <button className="text-xs font-semibold px-4 py-2.5 rounded-full border border-accent-700/70 text-accent-200 hover:bg-accent hover:text-accent-ink hover:border-accent transition whitespace-nowrap">Sponsor a room</button>
        </div>
      </section>
    </div>
  )
}

// ── tiny inline icons (no emoji-as-icon) ──
function Flame() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden className="translate-y-[0.5px]">
      <path d="M12 2c.6 2.7 2.5 3.9 3.6 5.6C16.6 9.2 17 10.6 17 12a5 5 0 1 1-10 0c0-1.3.5-2.4 1.3-3.3.2.9.9 1.6 1.8 1.6 1.2 0 1.6-.9 1.3-2.4C11 5.9 11.2 3.9 12 2z" />
    </svg>
  )
}
function Lock() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}
