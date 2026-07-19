# Fan Zone — a provably-fair live watch room

**TxODDS × Solana World Cup Hackathon · Consumer & Fan Experiences**

Fan Zone turns a TxLINE match into a group prediction room: friends call the
result, watch consensus probabilities re-price on **every relevant SSE tick**, react
to an automatically narrated room pulse, and settle against TxLINE's Solana-anchored
proof. It is a social match experience first—not a wagering interface.

**Live product:** https://fanzone-txline.vercel.app<br>
**Credential-free interactive replay:** https://fanzone-txline.vercel.app/?replay=1<br>
**Technical documentation:** [`SUBMISSION_TECHNICAL_DOCUMENTATION.md`](./SUBMISSION_TECHNICAL_DOCUMENTATION.md)

## What is novel

- **The odds feed becomes the conversation.** Fan Zone consumes TxLINE's persistent
  odds and score SSE streams, filters them per fixture, updates the broadcast ticket
  per tick, and converts meaningful changes into a sourced, human-readable **Room
  Pulse**. Reactions sit in the same timeline, joining market consensus and fan
  emotion in one live artifact.
- **A provably-fair sweepstake, end to end.** A call can be timestamped in a real
  Solana devnet Memo before kickoff; the final score is then matched to TxLINE's
  `stat-validation` Merkle root. Neither the host nor a friend gets to rewrite the
  pick or quietly choose the result.
- **Wallet ownership without wallet friction.** A configured production room opens
  with Privy's Solana sign-up and embedded wallet—no seed phrase or extension. The
  wallet address is attached to the call. The account-free guest path remains
  available for accessibility and reproducible judging.
- **Trust can be reproduced without trust.** The bundled judge replay drives the
  exact same mapping, narrative, and grading functions as the live stream. It needs
  no TxLINE credential, wallet, RPC, token, database, or third-party account.

The product is free for fans. Bars, supporter groups, broadcasters, and sponsors
pay for branded rooms, organizer-funded prize-pool tooling where lawful, and
aggregate campaign analytics.

## For judges — zero setup, zero credentials

Verify the feed mapping, malformed-event handling, narratives, and deterministic
grading in one command:

```bash
npm ci && npm test && npm run judge:verify
```

Run the full interface against the bundled TxLINE-shaped stream:

```bash
npm run dev
# open http://localhost:3000/?replay=1
```

The UI labels this path **“TxLINE SSE · judge replay.”** It never calls replay live.
Without `?replay=1`, the app attempts the real TxLINE SSE stream and explicitly
labels its 30-second snapshot resilience path **“TxLINE snapshot fallback.”**

Container path:

```bash
docker compose up --build
# open http://localhost:3000/?replay=1
```

## Product flow

1. **Enter through Solana.** When Privy is configured, the primary action creates
   an embedded Solana wallet. In judge/guest mode, continue without an account.
2. **Join or share a room.** The URL carries a stable room slug and opens the same
   leaderboard for the group.
3. **Follow the match live.** TxLINE score and de-margined 1X2 SSE ticks immediately
   re-price the match ticket and generate the Room Pulse narrative.
4. **Lock a call.** Choose Home, Draw, or Away, optionally add an exact score, and
   commit it before kickoff. A configured deployment writes the call as a Solana
   devnet Memo and exposes the explorer proof.
5. **Settle and share.** At full time the deterministic grader awards 100 points for
   the outcome plus 150 for an exact score. TxLINE's validation root supplies the
   result proof, and the fan can share a personalized “I called it” card.

## Live TxLINE integration

Fan Zone uses TxLINE as an operational input, not a README mention. Server routes
hold the credential and guest JWT; no subscription token reaches browser JavaScript.

| TxLINE endpoint | How Fan Zone uses it |
|---|---|
| `POST /auth/guest/start` | Short-lived server-side guest JWT |
| `GET /api/fixtures/snapshot` | World Cup fixture discovery |
| `GET /api/odds/stream` | Persistent, per-tick 1X2 probability updates |
| `GET /api/scores/stream` | Persistent live score and final-state updates |
| `GET /api/odds/snapshot/{fixtureId}` | Slow resilience path and featured-match scan |
| `GET /api/scores/snapshot/{fixtureId}` | Slow resilience path and final score lookup |
| `GET /api/scores/stat-validation` | Merkle-root evidence for settlement |

The app accepts only a matching fixture and a valid de-margined 1X2 array. Bad
numbers, unrelated fixtures, and malformed score records fail closed. The UI never
invents an even probability when TxLINE has no market.

## Provably fair on Solana

- **Pre-kickoff commitment.** `/api/commit` writes a compact call to the public
  Solana Memo program on devnet, returning a transaction explorer link.
- **Wallet ownership.** With Privy enabled, the embedded wallet public address is
  included as the call owner. The server signer pays devnet fees to keep the fan
  flow free; this custodial relay is disclosed rather than presented as self-custody.
- **Proof settlement.** `/api/settle` requests the score's TxLINE validation data and
  surfaces its Merkle root plus the public TxLINE oracle program link.
- **Shared board without a database.** When the commit signer is enabled, the room
  can reconstruct calls directly from its public Memo transaction history. KV is an
  optional performance/durability layer, not the source of proof.

These token-shaped values are **public devnet identifiers, not secrets**:

- TxLINE oracle program: `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`
- Solana Memo program: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`
- Default RPC: `https://api.devnet.solana.com`

Private material is environment-only. `.env*`, credentials, keypairs, PEM files,
and JSONL operational logs are ignored by git and excluded from Docker context.

## Honest operating states

- **Live:** browser EventSource → `/api/live` → TxLINE SSE. The ticket and Room Pulse
  change per relevant feed event.
- **Replay:** `?replay=1` → bundled, deterministic TxLINE-shaped sequence → the same
  normalizers and UI. This is the recommended review path after matches finish.
- **Snapshot fallback:** if an upstream SSE connection is unavailable, snapshots
  refresh every 30 seconds and the transport badge changes accordingly.
- **No market:** the probability area says it is awaiting TxLINE 1X2; no number is
  fabricated.
- **No Solana signer:** prediction and replay still work; commit controls and claims
  of on-chain writing are hidden.

## Architecture

```text
browser EventSource ── /api/live?kind=odds|scores ── TxLINE persistent SSE
browser snapshots  ── /api/txline/*              ── TxLINE REST snapshots
browser room       ── /api/room                  ── Solana history or optional KV
browser lock       ── /api/commit                ── Solana devnet Memo
browser settle     ── /api/settle                ── TxLINE Merkle validation root
                           │
                    server-only JWT + token
```

Important modules:

- `src/app/api/live/route.ts` — authenticated SSE proxy, fixture filter, replay mode.
- `src/lib/live.mjs` — pure live odds/score mapping, narration, SSE parsing, grading.
- `src/lib/txline-server.ts` — server-only auth, snapshot access, settlement proof.
- `src/lib/solana.ts` — devnet Memo commitments and room reconstruction.
- `src/components/SweepstakeRoom.tsx` — live ticket, Room Pulse, calls, and proofs.
- `test/live.test.mjs` — malformed input, live/final mapping, grading, and SSE tests.
- `scripts/judge-verify.mjs` — credential-free deterministic proof of the core loop.

## Business model / monetization

Fan access stays free. Revenue comes from the organizations that want participation:

1. **Premium and branded rooms:** event/season subscriptions for custom identity,
   moderation, data export, sponsor placement, and multi-room administration.
2. **Organizer-funded reward pools:** where local law permits, an explicitly
   disclosed platform fee for tooling around sponsor-funded prizes. Fan scoring does
   not require money and Fan Zone does not custody wagers.
3. **Sponsor campaigns and intelligence:** campaign pricing for branded prompts plus
   aggregate participation, retention, and room-sentiment reporting.

The first B2B customer is a sports bar or supporter group running a major-match
watch party; the same product scales to broadcasters and rights-holders.

## Local configuration

No environment variables are required for tests, the judge verifier, or replay.
Live/production capabilities are enabled individually:

| Variable | Purpose |
|---|---|
| `TXLINE_API_TOKEN` | Server-only live TxLINE feed access |
| `TXLINE_API_ORIGIN` | Optional TxLINE origin override |
| `FZ_DEVNET_SECRET` | Optional funded devnet relay keypair for Memo commits |
| `FZ_DEVNET_RPC` | Optional Solana devnet RPC override |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Optional embedded Solana wallet signup |
| `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` | Optional durable room cache |

```bash
npm ci
npm run dev
npm test
npm run build
```

## TxLINE API feedback

**What worked especially well:** the normalized schema across fixtures, odds, and
scores made one deterministic mapping layer possible. The de-margined probability
array is unusually useful for a fan product because it can drive a readable 1X2 bar
without pricing math in the browser. The SSE endpoints make the experience feel
like a live room instead of a periodic scoreboard.

**Where we hit friction:** feed access requires the subscribe/activation sequence
before requests stop returning “Missing API token,” and that prerequisite was easy
to miss initially. During quiet or completed match windows, fixture-level odds can
be sparse; consumers therefore need last-good state, explicit no-market UX, and a
recorded replay to demonstrate event behavior after the competition window. Clearer
examples of score status IDs and stream reconnection semantics would reduce bespoke
defensive code.

## Scope and safety

Fan Zone is a free social prediction and sponsor-engagement tool. The demo uses
Solana devnet and has no deposits, wagering, cash-out, or financial return. Any
future organizer-funded reward feature must be enabled only where lawful and with
appropriate consumer-protection controls.
