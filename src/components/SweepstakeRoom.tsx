'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { txline, readScore, readOdds, type Fixture, type Score, type Odds } from '@/lib/txline'
import { usePrivyBridge, PrivySignIn } from '@/components/privy'

type Pick = 'home' | 'draw' | 'away'
const FLAG: Record<string, string> = {
  France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Argentina: '🇦🇷', Brazil: '🇧🇷',
  Australia: '🇦🇺', Vietnam: '🇻🇳', Myanmar: '🇲🇲', 'New Zealand': '🇳🇿', India: '🇮🇳',
  Liechtenstein: '🇱🇮', Gibraltar: '🇬🇮',
}
const flag = (t: string) => FLAG[t] || '⚽'
const PICK_PTS = 100, EXACT_BONUS = 150
const EMPTY_SCORE: Score = { h: 0, a: 0, status: 'Awaiting kickoff', live: false, finished: false, seq: 0 }

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

  return (
    <div className="max-w-3xl mx-auto px-5 py-14 space-y-10">
      {/* room bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] px-2.5 py-1 rounded-full border rule text-ink-soft">
            Room · <b className="text-ink font-semibold">{room}</b>
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${shared || onchainShared ? 'border-pitch-800/70 text-pitch-300' : 'rule text-ink-faint'}`}
            title={onchainShared ? 'Every call is a Memo tx — the board is read straight from Solana, shared across all devices' : undefined}>
            {onchainShared ? 'shared · read from Solana' : shared ? 'shared' : 'local'}
          </span>
          {streak > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-300" title="correct calls in a row">
              🔥 {streak} streak
            </span>
          )}
          <PrivySignIn />
        </div>
        <button onClick={share} className="text-[11px] px-3 py-1.5 rounded-full border rule text-ink-soft hover:text-ink hover:rule-strong transition">
          {copied ? 'link copied ✓' : 'Invite friends ↗'}
        </button>
      </div>

      {/* featured match + win-prob */}
      {!sel && (
        <div className="border rule rounded-2xl bg-paper-900/40 px-6 sm:px-8 py-9 animate-pulse">
          <div className="h-2.5 w-32 bg-white/5 rounded mb-8" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
            <div className="flex flex-col items-center gap-2.5"><div className="w-12 h-12 rounded-full bg-white/5" /><div className="h-2.5 w-16 bg-white/5 rounded" /></div>
            <div className="h-16 w-28 bg-white/5 rounded" />
            <div className="flex flex-col items-center gap-2.5"><div className="w-12 h-12 rounded-full bg-white/5" /><div className="h-2.5 w-16 bg-white/5 rounded" /></div>
          </div>
          <div className="h-2 rounded-full bg-white/5 mt-8" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint mt-4">Scanning TxLINE for the liveliest match…</p>
        </div>
      )}
      {sel && (
        <div className="border rule rounded-2xl bg-paper-900/40 px-6 sm:px-8 py-8">
          <div className="flex items-center justify-between mb-8 gap-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]">
              {score.live && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
              <span className={score.live ? 'text-red-300' : 'text-ink-mute'}>{score.status}</span>
            </span>
            <div className="flex items-center gap-3">
              {isFeatured && <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.16em] text-pitch-400/80">✦ liveliest on TxLINE</span>}
              {fixtures.length > 1 && (
                <select value={sel.FixtureId} onChange={e => setSel(fixtures.find(f => f.FixtureId === Number(e.target.value)) || sel)}
                  className="text-[11px] bg-transparent border rule rounded-md px-2 py-1 text-ink-mute outline-none">
                  {fixtures.map(f => <option key={f.FixtureId} value={f.FixtureId} className="bg-paper-900">{f.Participant1} v {f.Participant2}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* the score — oversized editorial serif */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2.5">{flag(sel.Participant1)}</div>
              <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-ink-soft">{sel.Participant1}</div>
            </div>
            <div className="font-display font-semibold tnum leading-none tracking-[-0.02em] text-[clamp(3rem,13vw,5.5rem)] flex items-baseline gap-2 sm:gap-3">
              <AnimatedInt value={score.h} /><span className="text-ink-faint">–</span><AnimatedInt value={score.a} />
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-2.5">{flag(sel.Participant2)}</div>
              <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-ink-soft">{sel.Participant2}</div>
            </div>
          </div>

          {/* live win-probability — thin elegant bar (real TxLINE 1X2, or an honest empty state) */}
          <div className="mt-8 pt-6 border-t rule">
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">Win probability</span>
              <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${odds ? 'text-pitch-400/80' : 'text-ink-faint'}`}>
                {odds ? 'live · de-margined' : 'awaiting 1X2'}
              </span>
            </div>
            {odds ? (
              <>
                <div className="h-2 rounded-full overflow-hidden bg-white/10 flex">
                  <div className="bg-pitch-500 transition-all duration-700 ease-out" style={{ width: `${odds.home * 100}%` }} title={`${sel.Participant1} ${(odds.home*100).toFixed(0)}%`} />
                  <div className="bg-ink-faint transition-all duration-700 ease-out" style={{ width: `${odds.draw * 100}%` }} title={`Draw ${(odds.draw*100).toFixed(0)}%`} />
                  <div className="bg-amber-400 transition-all duration-700 ease-out" style={{ width: `${odds.away * 100}%` }} title={`${sel.Participant2} ${(odds.away*100).toFixed(0)}%`} />
                </div>
                <div className="flex justify-between mt-2.5 font-mono text-[11px] tnum">
                  <span className="text-pitch-300">{sel.Participant1} <AnimatedPct value={odds.home} /></span>
                  <span className="text-ink-mute">Draw <AnimatedPct value={odds.draw} /></span>
                  <span className="text-amber-300">{sel.Participant2} <AnimatedPct value={odds.away} /></span>
                </div>
              </>
            ) : (
              <div className="h-2 rounded-full bg-[repeating-linear-gradient(45deg,rgba(243,240,234,0.09),rgba(243,240,234,0.09)_7px,transparent_7px,transparent_14px)]"
                title="TxLINE hasn't posted a 1X2 market for this fixture yet" />
            )}
          </div>
        </div>
      )}

      {/* prediction */}
      {sel && (
        <div className="border rule rounded-2xl bg-paper-900/40 px-6 sm:px-8 py-7">
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h2 className="font-display text-xl font-semibold">Call the result</h2>
            {!locked && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint shrink-0">Winner {PICK_PTS} · exact +{EXACT_BONUS}</span>}
          </div>
          {!locked ? (
            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="your name"
                className="w-full bg-transparent border rule rounded-lg px-3.5 py-3 text-sm text-ink placeholder:text-ink-mute focus:rule-strong outline-none transition" />
              <div className="grid grid-cols-3 gap-2">
                {(['home', 'draw', 'away'] as Pick[]).map(k => {
                  const label = k === 'home' ? sel.Participant1 : k === 'away' ? sel.Participant2 : 'Draw'
                  return <button key={k} onClick={() => setPick(k)} className={`px-3 py-3 rounded-lg text-sm border transition truncate ${pick === k ? 'border-pitch-500 bg-pitch-500 text-[#06210f] font-semibold' : 'rule text-ink-soft hover:text-ink hover:rule-strong'}`}>{label}</button>
                })}
              </div>
              <input value={exact} onChange={e => setExact(e.target.value)} placeholder="exact score (optional, e.g. 2-1)"
                className="w-full bg-transparent border rule rounded-lg px-3.5 py-3 text-sm text-ink placeholder:text-ink-mute focus:rule-strong outline-none transition" />
              <button onClick={lockIn} disabled={!pick || !name.trim()} className="w-full py-3 rounded-lg bg-pitch-500 hover:bg-pitch-400 disabled:opacity-40 disabled:hover:bg-pitch-500 text-[#06210f] text-sm font-semibold transition">Lock it in</button>
            </div>
          ) : (
            <p className="text-sm text-ink-soft leading-relaxed">
              Locked: <b className="text-ink font-semibold">{locked.pick === 'home' ? sel.Participant1 : locked.pick === 'away' ? sel.Participant2 : 'Draw'}</b>
              {locked.exact && <> · {locked.exact[0]}–{locked.exact[1]}</>}.
              {score.finished
                ? <> Full time {score.h}–{score.a} → you {grade(locked) > 0 ? `scored ${grade(locked)} pts 🎉` : 'missed this one'}.</>
                : <> Come back at full time — it grades live from the TxLINE result.</>}
              {actualLabel && locked.pick !== actualLabel && <span className="text-ink-mute"> (result: {actualLabel})</span>}
            </p>
          )}
          {chainOn && locked && (
            <div className="mt-4 text-xs">
              {commit?.pending && <span className="text-ink-mute">🔒 stamping your call on Solana devnet…</span>}
              {commit?.signature && (
                <a href={commit.explorer} target="_blank" rel="noopener noreferrer" className="text-pitch-300 hover:underline">
                  🔒 Call committed on-chain before kickoff · view proof ↗
                </a>
              )}
            </div>
          )}
          {locked && (
            <button onClick={shareCall} className="mt-4 text-[11px] px-3 py-1.5 rounded-full border border-pitch-700/70 text-pitch-200 hover:bg-pitch-500 hover:text-[#06210f] hover:border-pitch-500 transition">
              {callCopied ? 'link copied ✓' : 'Share my call ↗'}
            </button>
          )}
        </div>
      )}

      {/* shared leaderboard */}
      <div className="border rule rounded-2xl bg-paper-900/40 px-6 sm:px-8 py-7">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Leaderboard</h2>
          <button onClick={() => loadBoard(room)} className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink-mute transition">refresh</button>
        </div>
        {board.length === 0 ? (
          <p className="text-sm text-ink-mute">No calls yet. Lock a prediction and share the room link to fill it up.</p>
        ) : (
          <div className="divide-y divide-white/[0.07]">
            {board.map((r, i) => {
              const call = onchainCalls.find(c => c.alias === r.name)
              const me = r.name === name.trim()
              return (
                <div key={r.name + i} className={`flex items-center justify-between gap-3 py-2.5 text-sm ${me ? 'text-pitch-200' : 'text-ink-soft'}`}>
                  <span className="flex items-baseline gap-3 min-w-0">
                    <span className="font-mono text-[11px] text-ink-faint tnum shrink-0">{i + 1}</span>
                    <span className="truncate">{r.name}{call && <span className="text-ink-faint"> · {call.pick}</span>}</span>
                  </span>
                  <span className="flex items-center gap-2.5 shrink-0">
                    {call && <a href={`https://explorer.solana.com/tx/${call.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-faint hover:text-pitch-300 transition" title="this call, on Solana">↗</a>}
                    <span className="font-mono tnum text-ink">{r.pts}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* provably fair — on-chain trust layer */}
      {chainOn && (
        <div className="border border-pitch-900/40 rounded-2xl bg-pitch-950/15 px-6 sm:px-8 py-7">
          <div className="flex items-center gap-2.5 mb-3">
            <h2 className="font-display text-xl font-semibold text-pitch-100">Provably fair</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint border rule rounded-full px-2 py-0.5">Solana devnet</span>
          </div>
          <p className="text-sm text-ink-mute leading-relaxed max-w-2xl text-pretty">
            Every call is <b className="text-ink-soft font-semibold">timestamped on Solana devnet before kickoff</b> (a real
            transaction you can open in Explorer), so nobody in your room can change a pick after the fact. At full
            time the result is <b className="text-ink-soft font-semibold">tied to TxLINE&apos;s stat-validation Merkle root</b> —
            the exact value TxODDS anchors on-chain — so it isn&apos;t &ldquo;trust the app,&rdquo; it&apos;s pinned to
            TxODDS&apos;s own cryptographic attestation.
          </p>
          {settle && (
            <div className="mt-4 text-xs">
              {settle.verified ? (
                <a href={settle.programExplorer} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-pitch-300 hover:underline font-mono">
                  ✓ matched to TxLINE&apos;s anchored root · {settle.root?.slice(0, 8)}… · seq {settle.seq} · oracle program ↗
                </a>
              ) : (
                <span className="text-ink-faint">{settle.detail}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* monetization */}
      <div className="border rule rounded-2xl px-6 sm:px-8 py-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="font-display text-lg font-semibold">Host a branded room</div>
          <div className="text-sm text-ink-mute mt-1 max-w-md text-pretty">Sponsored sweepstakes, custom themes &amp; prize pools — the Sleeper model. Rooms are the product.</div>
        </div>
        <button className="text-xs px-4 py-2 rounded-full border border-pitch-700/70 text-pitch-200 hover:bg-pitch-500 hover:text-[#06210f] hover:border-pitch-500 transition whitespace-nowrap">Sponsor a room</button>
      </div>
    </div>
  )
}
