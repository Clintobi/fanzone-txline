# Fan Zone — Live World Cup Companion

**TxODDS × Solana World Cup Hackathon · Consumer and Fan Experiences track**

A fan-facing second-screen app that turns TxLINE's real-time World Cup feed into
an engaging experience: **live scores that update the instant they happen**, a
live match-event feed, and a casual **predict-the-winner** game with points and
a leaderboard. No wallet, no money — pure engagement.

**Live:** _(deployed URL below)_

## What it does

- **Live match center** — pick any fixture; the app subscribes to TxLINE's
  Server-Sent Events score stream and updates the score + event feed in real time
  during the match. No refresh.
- **Predict the winner** — call Home / Draw / Away before kickoff, lock it in,
  earn points, keep a streak.
- **Leaderboard** — compete with other fans; your score persists locally.

## Core idea & highlights

Most fans watch with a phone in hand. Fan Zone is the companion screen: it reacts
to what's happening on the pitch the moment TxLINE publishes it, and layers a
light, replayable prediction game on top — the kind of low-friction, mainstream
experience that keeps fans in the app across all 104 matches.

- Instant reactivity via SSE (no polling).
- Zero onboarding friction — open and play, no wallet.
- Clean, mobile-first UI.

## TxLINE endpoints used

- `POST /auth/guest/start` — guest JWT.
- `GET /api/fixtures/snapshot` — the World Cup fixture list.
- `GET /api/scores/stream` (SSE) — real-time score + match-event updates.

(Data access uses a free-tier API token obtained via TxLINE's on-chain subscribe
flow; sign-up is through Solana per the track requirement.)

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export -> out/
```

## TxLINE API feedback

**Liked:** the single normalised JSON schema across fixtures/scores/odds made it
trivial to go from auth → live scores; the SSE stream is genuinely real-time and
the demargined odds book hands you clean implied probabilities. **Friction:**
data access requires an on-chain subscribe + `/api/token/activate` before the
API returns anything (a 403 "Missing API token" until then — not obvious from a
first read); pre-match snapshots are sparse/transient, so a client needs to cache
the last-seen values and lean on the stream during live play.
