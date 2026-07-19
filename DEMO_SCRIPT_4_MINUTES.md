# Fan Zone — 4:00 Demo Script

Target runtime: **3:48–3:58**. Record at 1440p, browser zoom 100%, notifications off.
Use a clean room URL such as `/?replay=1&room=clinton-final`. Keep the transport
badge visible whenever calling the feed “replay” or “live.” Never call replay live.

## Pre-record checklist

- Open the deployed replay URL in a fresh browser window.
- Open the GitHub README at the “For judges” section in a second tab.
- Open a terminal in the repo with large text; run `clear` but do not run commands yet.
- Have the repository's `src/app/api/live/route.ts` and `src/lib/live.mjs` open in
  an editor with minimap and sidebars hidden.
- Confirm the room starts unlocked and the Room Pulse is visible above the fold
  after one small scroll.
- Reload the replay URL immediately before the call sequence; the final event lands
  about 54 seconds later, leaving time to lock a prediction before settlement.
- Record one continuous screen capture. Add cuts and crops in post; do not depend on
  a live match being active.

## Editorial timeline

### 0:00–0:13 — Cold open: the result

**Picture:** Begin tightly cropped on the match ticket as the probability bar moves.
Let one Room Pulse event arrive. Cut on the motion to the full product view.

**Narration:**

> Sports watch parties are full of predictions—and arguments about who actually
> called it. Fan Zone turns a TxLINE match into a live, provably-fair room where the
> data, the call, and the final result can all prove themselves.

**On-screen title:** `FAN ZONE · CALL IT TOGETHER. PROVE IT LATER.`

### 0:13–0:38 — Product and TxLINE value

**Picture:** Hold on hero and match ticket. Slowly pan from score to de-margined 1X2
bar. Keep `TxLINE SSE · judge replay` legible.

**Narration:**

> Pick a match, invite your group, and call home, draw, away—or an exact score. The
> broadcast ticket is powered by TxLINE scores and de-margined one-X-two odds. This
> recording uses the clearly labelled judge replay because the tournament window can
> be quiet during review; the deployed default connects to TxLINE's real persistent
> odds and score streams.

**Overlay:** `Same mapper · Same UI · Explicitly labelled replay`

### 0:38–1:10 — Per-tick SSE and Room Pulse

**Picture:** Scroll to Room Pulse. Let an odds event and score event arrive. Briefly
highlight the source labels. Click **What a swing** once.

**Narration:**

> Fan Zone does not wait for an eight-second round. Every relevant SSE tick updates
> the ticket immediately. Meaningful movement becomes a sourced Room Pulse: the app
> explains who gained support, by how much, and what the new consensus is. A score
> change creates its own narrative, and fan reactions join the same timeline. The
> novelty is simple: TxLINE's machine feed becomes the shared conversation.

**Overlay:** `TxLINE odds + TxLINE score + room reaction`

### 1:10–1:51 — Make and prove a call

**Picture:** Scroll to Call the Result. Enter `Clinton`, select the home side, enter
`2-1`, then click the lock button. If Privy is active, show the Solana sign-up sheet
for two seconds, then use a prepared signed-in take for the final click. Show the
locked state and explorer link if available.

**Narration:**

> The fan signs up through an embedded Solana wallet—no extension and no seed phrase.
> Guest mode remains available for accessibility and judge reproducibility. I call
> the home side, two–one, and lock it. On the production configuration, Fan Zone
> writes a Solana devnet Memo before kickoff and attaches my wallet address as owner.
> The transaction timestamp makes the prediction tamper-evident: neither I nor the
> room host can rewrite it after the match changes.

**Editorial note:** If the devnet signer is unavailable, do not fake this shot. Show
the README proof flow and say “when configured,” exactly as above.

### 1:51–2:21 — Automatic settlement

**Picture:** Cut to the final replay event arriving, then the locked-result message
showing the points. Scroll to Provably Fair. Highlight the root and oracle link if
present; otherwise show the architecture diagram from the README.

**Narration:**

> At full time, the same deterministic function grades every call: one hundred points
> for the result and another one hundred and fifty for the exact score. Settlement
> asks TxLINE for stat-validation and surfaces the Merkle root TxODDS anchors on
> Solana. The product is honest about the boundary: this is devnet, and it displays
> the upstream proof instead of asking the group to trust a private scorekeeper.

### 2:21–2:45 — Group loop and business

**Picture:** Show invite, leaderboard, and one personalized share-card preview. End
on the monetization section, lingering on the three revenue lines.

**Narration:**

> A room link brings the group back, the leaderboard can reconstruct committed calls
> from Solana, and every fan can share an “I called it” card. Fans play free. Bars,
> supporter groups, broadcasters, and sponsors pay for branded rooms, lawful
> organizer-funded prize tooling, and aggregate campaign intelligence.

### 2:45–3:19 — Show the engineering, not slides

**Picture:** Cut to `src/app/api/live/route.ts`. Highlight the two stream URLs,
fixture filter, and explicit replay branch. Cut to `src/lib/live.mjs`; highlight
validation and `gradePrediction`. Do not scroll fast.

**Narration:**

> Under the interface, credentials stay server-side. This route opens TxLINE odds or
> score SSE, parses chunk boundaries safely, filters the selected fixture, and sends
> only relevant events to the browser. The pure live module rejects malformed and
> unrelated records, normalizes probabilities to one hundred percent, narrates
> material movement, and grades the final call. Replay and production execute these
> same functions—there is no demo-only scoring path.

### 3:19–3:43 — Reproducibility proof

**Picture:** Terminal. Run exactly:

```bash
npm test && npm run judge:verify
```

Keep the six passing tests and `ALL CHECKS PASS · 6 / 6` visible.

**Narration:**

> A judge can verify the core loop with one command. Six tests cover SSE parsing,
> malformed input, score states, probability mapping, narrative movement, and exact
> grading. The verifier then replays the proof set with no wallet, token, RPC,
> database, fees, or third-party account. Docker is included for the same reason.

### 3:43–3:58 — Close

**Picture:** Return to the full room with the updated score, Room Pulse, and locked
call all in one frame. Finish on the repo and live URLs.

**Narration:**

> Fan Zone makes live sports data social, makes group predictions verifiable, and
> makes the whole experience reproducible after the final whistle. It is live now,
> built on TxLINE and Solana. Call it together. Prove it later.

**End card:**

```text
FAN ZONE
Live product · Public repository · Credential-free replay
TxLINE × Solana
```

## Audio and edit standard

- Narration pace: 142–148 words per minute, confident and conversational.
- Duck UI clicks to −24 dB; voice peak around −3 dB; restrained music around −28 dB.
- Use hard cuts for proof/code, 8–12 frame dissolves only between product chapters.
- Add captions for every word; keep two lines maximum and protect the lower UI.
- Use subtle 105–112% punch-ins on the transport badge, Pulse source label, Solana
  proof, and 6/6 verifier. No decorative zooms.
- Do not show secrets, `.env` files, wallet private keys, browser bookmarks, or
  personal notifications.
