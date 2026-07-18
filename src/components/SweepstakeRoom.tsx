'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { txline, readScore, readOdds, type Fixture, type Score, type Odds } from '@/lib/txline'

type Pick = 'home' | 'draw' | 'away'
const FLAG: Record<string, string> = {
  France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Argentina: '🇦🇷', Brazil: '🇧🇷',
  Australia: '🇦🇺', Vietnam: '🇻🇳', Myanmar: '🇲🇲', 'New Zealand': '🇳🇿', India: '🇮🇳',
  Liechtenstein: '🇱🇮', Gibraltar: '🇬🇮',
}
const flag = (t: string) => FLAG[t] || '⚽'
const PICK_PTS = 100, EXACT_BONUS = 150
const EMPTY_SCORE: Score = { h: 0, a: 0, status: 'Awaiting kickoff', live: false, finished: false, seq: 0 }

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
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)

  // is the on-chain commit signer configured on this deploy?
  useEffect(() => {
    fetch('/api/commit').then(r => r.json()).then(d => setChainOn(!!d.enabled)).catch(() => {})
  }, [])

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
    try { const d = await (await fetch(`/api/room?room=${encodeURIComponent(r)}`)).json(); setBoard(d.board || []); setShared(!!d.shared) } catch {}
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
          body: JSON.stringify({ room, alias: name.trim(), fixture: `${sel.Participant1} v ${sel.Participant2}`, pick: pickLabel, exact: lk.exact ? `${lk.exact[0]}-${lk.exact[1]}` : '' }),
        })).json()
        setCommit(c?.signature ? { signature: c.signature, explorer: c.explorer } : null)
      } catch { setCommit(null) }
    }
  }

  // when the match finishes, re-grade a pending pick and push the result
  useEffect(() => {
    if (locked && score.finished && name.trim()) {
      const pts = grade(locked)
      fetch('/api/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, name: name.trim(), pts }) })
        .then(r => r.json()).then(d => { setBoard(d.board || []); setShared(!!d.shared) }).catch(() => {})
    }
  }, [score.finished]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* room bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-pitch-950 border border-pitch-800 text-pitch-300">
            Sweepstake room · <b>{room}</b>
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${shared ? 'bg-pitch-900/50 text-pitch-300' : 'bg-slate-800 text-slate-500'}`}>
            {shared ? 'shared leaderboard' : 'local (connect KV to share)'}
          </span>
        </div>
        <button onClick={share} className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-pitch-600">
          {copied ? 'link copied ✓' : 'Invite friends ↗'}
        </button>
      </div>

      {/* featured match + win-prob */}
      {!sel && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
          <div className="h-4 w-28 bg-slate-800 rounded mb-6" />
          <div className="flex items-center justify-center gap-6 py-2">
            <div className="flex-1 flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-slate-800" /><div className="h-3 w-16 bg-slate-800 rounded" /></div>
            <div className="h-10 w-20 bg-slate-800 rounded" />
            <div className="flex-1 flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-slate-800" /><div className="h-3 w-16 bg-slate-800 rounded" /></div>
          </div>
          <div className="h-3 rounded-full bg-slate-800 mt-6" />
          <p className="text-[11px] text-slate-600 mt-3">Scanning TxLINE for the liveliest match…</p>
        </div>
      )}
      {sel && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs px-2 py-0.5 rounded-full ${score.live ? 'bg-red-500/15 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
              {score.live && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5 animate-pulse" />}{score.status}
            </span>
            <div className="flex items-center gap-2">
              {isFeatured && <span className="text-[10px] text-pitch-400/80">✦ liveliest on TxLINE</span>}
              {fixtures.length > 1 && (
                <select value={sel.FixtureId} onChange={e => setSel(fixtures.find(f => f.FixtureId === Number(e.target.value)) || sel)}
                  className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-400">
                  {fixtures.map(f => <option key={f.FixtureId} value={f.FixtureId}>{f.Participant1} v {f.Participant2}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 py-2">
            <div className="text-center flex-1"><div className="text-4xl mb-1">{flag(sel.Participant1)}</div><div className="font-display text-sm text-slate-200">{sel.Participant1}</div></div>
            <div className="font-mono text-5xl font-bold tabular-nums">{score.h}<span className="text-slate-600 mx-2">–</span>{score.a}</div>
            <div className="text-center flex-1"><div className="text-4xl mb-1">{flag(sel.Participant2)}</div><div className="font-display text-sm text-slate-200">{sel.Participant2}</div></div>
          </div>

          {/* live win-probability bar — real TxLINE 1X2, or an honest empty state (never a fake flat bar) */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>win probability</span>
              <span className={odds ? 'text-pitch-400/80' : 'text-slate-600'}>
                {odds ? 'live · de-margined from TxLINE odds' : 'awaiting TxLINE 1X2 market'}
              </span>
            </div>
            {odds ? (
              <>
                <div className="h-3 rounded-full overflow-hidden bg-slate-800 flex">
                  <div className="bg-pitch-500 transition-all" style={{ width: `${odds.home * 100}%` }} title={`${sel.Participant1} ${(odds.home*100).toFixed(0)}%`} />
                  <div className="bg-slate-500 transition-all" style={{ width: `${odds.draw * 100}%` }} title={`Draw ${(odds.draw*100).toFixed(0)}%`} />
                  <div className="bg-amber-500 transition-all" style={{ width: `${odds.away * 100}%` }} title={`${sel.Participant2} ${(odds.away*100).toFixed(0)}%`} />
                </div>
                <div className="flex justify-between text-[11px] mt-1 font-mono">
                  <span className="text-pitch-300">{sel.Participant1} {(odds.home*100).toFixed(0)}%</span>
                  <span className="text-slate-400">Draw {(odds.draw*100).toFixed(0)}%</span>
                  <span className="text-amber-300">{sel.Participant2} {(odds.away*100).toFixed(0)}%</span>
                </div>
              </>
            ) : (
              <div className="h-3 rounded-full bg-[repeating-linear-gradient(45deg,#1e293b,#1e293b_8px,#0f172a_8px,#0f172a_16px)]"
                title="TxLINE hasn't posted a 1X2 market for this fixture yet" />
            )}
          </div>
        </div>
      )}

      {/* prediction */}
      {sel && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-sm font-semibold mb-3">Call the result {locked ? '' : <span className="text-slate-500 font-normal">· winner {PICK_PTS} pts · exact score +{EXACT_BONUS}</span>}</h3>
          {!locked ? (
            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="your name"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-pitch-600 outline-none" />
              <div className="grid grid-cols-3 gap-2">
                {(['home', 'draw', 'away'] as Pick[]).map(k => {
                  const label = k === 'home' ? sel.Participant1 : k === 'away' ? sel.Participant2 : 'Draw'
                  return <button key={k} onClick={() => setPick(k)} className={`px-3 py-2.5 rounded-lg text-sm border transition ${pick === k ? 'border-pitch-500 bg-pitch-600 text-white' : 'border-slate-800 hover:border-slate-600'}`}>{label}</button>
                })}
              </div>
              <input value={exact} onChange={e => setExact(e.target.value)} placeholder="exact score (optional, e.g. 2-1)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-pitch-600 outline-none" />
              <button onClick={lockIn} disabled={!pick || !name.trim()} className="w-full py-2.5 rounded-lg bg-pitch-600 hover:bg-pitch-700 disabled:opacity-50 text-white text-sm font-semibold">Lock it in</button>
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              Locked: <b className="text-pitch-300">{locked.pick === 'home' ? sel.Participant1 : locked.pick === 'away' ? sel.Participant2 : 'Draw'}</b>
              {locked.exact && <> · {locked.exact[0]}–{locked.exact[1]}</>}.
              {score.finished
                ? <> Full time {score.h}–{score.a} → you {grade(locked) > 0 ? `scored ${grade(locked)} pts 🎉` : 'missed this one'}.</>
                : <> Come back at full time — it grades live from the TxLINE result.</>}
              {actualLabel && locked.pick !== actualLabel && <span className="text-slate-500"> (result: {actualLabel})</span>}
            </p>
          )}
          {chainOn && locked && (
            <div className="mt-3 text-xs">
              {commit?.pending && <span className="text-slate-500">🔒 stamping your call on Solana devnet…</span>}
              {commit?.signature && (
                <a href={commit.explorer} target="_blank" rel="noopener noreferrer" className="text-pitch-300 hover:underline">
                  🔒 Call committed on-chain before kickoff · view proof ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* shared leaderboard */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Room leaderboard</h3>
          <button onClick={() => loadBoard(room)} className="text-xs text-slate-500 hover:text-slate-300">refresh</button>
        </div>
        {board.length === 0 ? (
          <p className="text-xs text-slate-600">No calls yet. Lock a prediction and share the room link to fill it up.</p>
        ) : (
          <div className="space-y-1.5">
            {board.map((r, i) => (
              <div key={r.name + i} className={`flex items-center justify-between text-sm px-3 py-1.5 rounded ${r.name === name.trim() ? 'bg-pitch-950/40 text-pitch-200' : 'text-slate-400'}`}>
                <span>{i + 1}. {r.name}</span><span className="tabular-nums">{r.pts}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* provably fair — on-chain trust layer */}
      {chainOn && (
        <div className="rounded-2xl border border-pitch-900/50 bg-pitch-950/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-pitch-200">Provably fair</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Solana devnet</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every call is <b className="text-slate-200">timestamped on Solana before kickoff</b>, so nobody in your
            room can change a pick after the fact. At full time the result is
            <b className="text-slate-200"> settled from TxLINE&apos;s own on-chain Merkle proof</b> — the leaderboard
            isn&apos;t &ldquo;trust the app,&rdquo; it&apos;s verified from the same proof TxODDS anchors on-chain.
          </p>
          {settle && (
            <div className="mt-3 text-xs">
              {settle.verified ? (
                <a href={settle.programExplorer} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-pitch-300 hover:underline">
                  ✓ Result settled from TxLINE on-chain proof · root {settle.root?.slice(0, 8)}… · seq {settle.seq} · oracle program ↗
                </a>
              ) : (
                <span className="text-slate-600">{settle.detail}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* monetization */}
      <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900/60 to-pitch-950/20 p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm font-semibold">Host a branded room</div>
          <div className="text-xs text-slate-500">Sponsored sweepstakes, custom themes & prize pools — the Sleeper model. Rooms are the product.</div>
        </div>
        <button className="text-xs px-3 py-1.5 rounded-lg bg-pitch-600/90 hover:bg-pitch-600 text-white">Sponsor a room</button>
      </div>
    </div>
  )
}
