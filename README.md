# Fan Zone — Final Sweepstake

**TxODDS × Solana World Cup Hackathon · Consumer & Fan Experiences track**

Spin up a World Cup **sweepstake room**, call the result, and watch a live
win-probability bar move on real TxLINE odds — a shared, invite-a-friend
leaderboard your whole group plays in. No wallet, no money, no friction: open the
link and play.

**Live:** https://fanzone-txline.vercel.app

## What it does

- **Featured match, always alive.** The server scans TxLINE's fixtures, odds and
  scores and features the *liveliest real match* — one with a genuine 1X2 market
  and, ideally, in-play with goals. So the flagship win-probability bar shows
  **real de-margined probabilities**, not a placeholder.
- **Call the result.** Pick Home / Draw / Away (+ an optional exact score for a
  bonus), lock it in, and it grades automatically off the real TxLINE full-time
  result.
- **Bring your group.** Every room has an invite link and a leaderboard. Connect
  a KV store (see [`SETUP-KV.md`](./SETUP-KV.md)) and the board is durable and
  shared across everyone in the room.
- **Provably fair.** Each locked call is committed on Solana before kickoff and
  the result settles from TxLINE's on-chain Merkle proof — see below.

## Data provenance (what's real, and what isn't)

Honesty matters more than a flashy claim, so here's exactly how data flows:

- **Live, server-side.** All TxLINE calls go through a server proxy
  (`src/app/api/txline/…`) that attaches a guest JWT + a free-tier subscription
  token and hits `txline-dev.txodds.com`. The token never ships to the browser.
  Fixtures, scores and de-margined 1X2 odds are the real feed.
- **Win-probability = real or nothing.** The bar renders only a genuine TxLINE
  1X2 market (`readOdds`, `src/lib/normalize.ts`). If a fixture has no 1X2 posted
  yet, the UI shows an explicit *"awaiting TxLINE 1X2 market"* state — it never
  fabricates a flat bar.
- **Graceful degradation, clearly bounded.** The dev feed is rate-limited/flaky,
  so the fixtures proxy falls back to the last-good list (or a 2-fixture seed) to
  avoid an empty screen. This is the degraded path only, never presented as live.
- **Leaderboard.** Durable + shared when `KV_REST_API_*` / `UPSTASH_REDIS_REST_*`
  is set; otherwise an in-memory fallback the UI honestly labels `local (connect
  KV to share)`.

## Provably fair — on-chain, without a wallet

Fan Zone is zero-friction (no wallet, no tokens, no stakes) **and** genuinely
on-chain, because the two aren't in tension:

- **Every call is committed on Solana before kickoff.** When you lock a pick, the
  server writes a Memo transaction on Solana **devnet** (`src/lib/solana.ts` →
  `/api/commit`) so the call is timestamped on-chain and can't be edited after
  the fact — real group trust for a sweepstake. It's a real, finalized devnet tx
  (server-custodial signing, disclosed — you don't need a wallet), not a hash we
  invent, with a live Solana Explorer link in the UI.
- **Results settle from TxLINE's on-chain Merkle proof.** At full time
  (`/api/settle`) we call TxLINE's `scores/stat-validation`, pull the
  `eventStatRoot` it anchors on Solana (oracle program
  `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`), and show the result as
  *verified from that proof* — the leaderboard is settled from the same on-chain
  attestation TxODDS publishes, not "trust our app."
- **Data access is on-chain-activated.** The free-tier feed was unlocked with a
  real on-chain subscribe transaction (kept out of the repo).

Honest limits: commits/settlement are on **devnet**; the commit signer is
server-custodial (a deliberate no-wallet UX), and each is clearly labeled
"Solana devnet" in the UI. Set `FZ_DEVNET_SECRET` (a funded devnet keypair) to
enable commits; absent it, `/api/commit` returns `{enabled:false}` and the UI
hides the feature — nothing is faked.

## Architecture

```
browser ── /api/txline/featured ──┐   scans fixtures+odds+scores, picks the
        ── /api/txline/<path>  ───┤   liveliest real match (server-side)
        ── /api/room           ───┤   room leaderboard (KV or in-memory)
        ── /api/commit         ───┤   Memo commit of a locked call (Solana devnet)
        ── /api/settle         ───┘   settle result vs TxLINE on-chain Merkle proof
                     │
       txline-server.ts (JWT+token) · solana.ts (devnet signer)
                     │
        txline-dev.txodds.com   +   Solana devnet
```

- `src/lib/normalize.ts` — pure score/odds normalizers, shared client + server.
- `src/lib/txline-server.ts` — server-only auth + upstream fetch + `settlementProof`.
- `src/lib/solana.ts` — server-custodial devnet signer for on-chain commits.
- `src/app/api/txline/featured/route.ts` — the liveliest-match scanner.
- `src/app/api/{commit,settle}/route.ts` — the on-chain trust layer.
- `src/components/SweepstakeRoom.tsx` — the room UI.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## TxLINE API feedback

**Liked:** the single normalised JSON schema across fixtures/scores/odds made it
trivial to go from auth → live scores; the de-margined odds book hands you clean
implied probabilities. **Friction:** data access requires an on-chain subscribe +
`/api/token/activate` before the API returns anything (a 403 "Missing API token"
until then — not obvious on first read); the dev feed is rate-limited and its
pre-match odds/scores are sparse and transient per fixture, so a client has to
scan across fixtures and cache the last-seen values (which is exactly what
`/api/txline/featured` does).
