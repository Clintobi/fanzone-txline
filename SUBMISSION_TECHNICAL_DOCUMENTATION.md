# Fan Zone — Technical Documentation

## Submission summary

Fan Zone is a live group sweepstake for the TxODDS Consumer & Fan Experiences
track. It turns TxLINE's event stream into a consumer loop: live match context,
social reaction, a pre-kickoff prediction, deterministic grading, and a proof-backed
result. The deployed app is https://fanzone-txline.vercel.app and the deterministic
review mode is https://fanzone-txline.vercel.app/?replay=1.

## Technical and business highlights

- Per-fixture browser EventSource backed by TxLINE odds and scores SSE.
- Pure, deterministic mapping from TxLINE payloads to scores, 1X2 probabilities,
  narratives, and points.
- Solana devnet Memo commitment before kickoff plus TxLINE Merkle-root settlement.
- Optional Privy embedded Solana wallet signup, with a credential-free guest mode.
- Social Room Pulse combining sourced feed movement and fan reaction.
- Offline replay, unit tests, Docker, and a one-command judge verifier.
- B2B monetization via branded rooms, sponsor-funded pool tooling where lawful,
  and aggregate campaign analytics; fan participation remains free.

## System flow

1. The server obtains and caches a TxLINE guest JWT.
2. `/api/live` opens `odds/stream` or `scores/stream` with server-only credentials.
3. It parses chunk-safe SSE frames, filters for the requested fixture, and forwards
   only relevant events to the browser.
4. Pure functions in `src/lib/live.mjs` validate and normalize the payload.
5. The UI updates the score/probability ticket and derives a Room Pulse entry.
6. A call is graded only once a validated full-time state exists.
7. If configured, the call is committed to Solana devnet and settlement exposes
   TxLINE's validation root.

## TxLINE endpoints

- `POST /auth/guest/start`
- `GET /api/fixtures/snapshot`
- `GET /api/odds/stream`
- `GET /api/scores/stream`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/scores/snapshot/{fixtureId}`
- `GET /api/scores/stat-validation?fixtureId=…&seq=…&statKeys=1,2`

All upstream requests are server-side. `TXLINE_API_TOKEN` is a deployment secret,
not source code or browser configuration.

## Decision logic

For a valid TxLINE 1X2 event, the three non-negative values are normalized by their
sum. This keeps the displayed outcomes totaling 100% and rejects malformed input.
The narrative layer compares the current and previous normalized vectors. A movement
must exceed 0.4 percentage points before it generates a feed entry, preventing noise.

At full time:

- correct Home/Draw/Away = 100 points;
- correct exact score after a correct result = +150 points;
- wrong result or non-final match = 0 points.

The same `gradePrediction` function is used in the UI, tests, and judge verifier.

## Resilience and integrity

- Chunk-safe SSE parsing supports CRLF, comments, IDs, and multi-line data.
- Browser EventSource reconnects automatically after transient disconnects.
- A 30-second REST snapshot path preserves useful state and is visibly labeled.
- Invalid fixture IDs, unrelated events, malformed odds, and non-numeric scores fail
  closed.
- Replay mode is explicitly labeled and uses the production normalization path.
- Calls are de-duplicated by fixture, score sequence, participant, and prediction
  before final grading.
- No build/type/lint errors are suppressed.

## Reproducibility

```bash
npm ci && npm test && npm run judge:verify
```

Expected result: 6 tests pass and the verifier reports 6/6 without using a wallet,
token, RPC, database, fee, or third-party account.

For a visual run:

```bash
npm run dev
# http://localhost:3000/?replay=1
```

Or:

```bash
docker compose up --build
```

## Public Solana identifiers

These are public devnet addresses, not credentials:

- TxLINE oracle program: `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`
- Memo program: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`
- RPC: `https://api.devnet.solana.com`

## Known boundaries

- Solana writes and explorer proofs are devnet demonstrations.
- The server relay pays devnet transaction fees; embedded wallets own the call
  identity but do not sign the relay transaction in this version.
- The bundled replay proves deterministic behavior after live matches end; it is
  never represented as a current upstream event.
- Reward-pool monetization is a future B2B capability subject to applicable law.
