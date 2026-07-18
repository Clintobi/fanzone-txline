# Fan Zone — 90-second demo script (record solo)

Goal: prove three things fast — **it's genuinely live TxLINE data**, **it's a
game anyone can play with no wallet**, and **it's social (a room your group
shares)**. Screen-record a phone-width browser (390px) at https://fanzone-txline.vercel.app.

Record around a real live/near-kickoff match if you can — the featured match
auto-selects the liveliest fixture, so the win-prob bar will be moving.

---

**[0:00–0:12] Hook — the live bar**
- Land on the page. Point at the header: *"Fan Zone turns TxLINE's live World Cup
  feed into a game your group plays."*
- Point at the win-probability bar: *"This bar is the real de-margined 1X2
  probability straight from TxLINE — France 51, draw 24, England 25 — updating
  server-side, no refresh."* (The ✦ badge shows it auto-featured the liveliest
  match.)

**[0:12–0:35] The core loop — call it**
- Type a name. Tap a result (e.g. the favourite), add an exact score `2–1`.
- Hit **Lock it in.** *"Winner's a hundred points, exact score another one-fifty.
  No stakes, no wallet — you just call it."*
- **On-chain beat (the wow):** point at *"🔒 Call committed on-chain before kickoff
  · view proof ↗"* and click it. *"No wallet — but your call just got timestamped
  on Solana. Your whole room's picks are locked on-chain before kickoff, so nobody
  can change theirs after a goal goes in."* Show the real tx on the Solana Explorer.

**[0:35–0:55] It's real — show the data**
- Open the fixture dropdown, switch to another match. *"Every fixture here is the
  live TxLINE snapshot — when a match has no 1X2 posted yet, we say so instead of
  faking a bar."* (Switch to one showing the striped "awaiting 1X2" state to prove
  the honesty.)
- Switch back to the featured match.

**[0:55–1:20] The social hook — the room**
- Tap **Invite friends** → *"Every sweepstake is a room with a share link."* Show
  the copied link / the `?room=` URL.
- Open the link in a second tab as a different name, lock a different call. Both
  names appear on the **shared leaderboard.** *"Your whole group in one board,
  live — this is the Sleeper-style party layer for the World Cup."*

**[1:20–1:35] Settlement — provably fair**
- Scroll to the **Provably fair** panel. If a match has finished, point at
  *"✓ Result settled from TxLINE on-chain proof · root … · oracle program ↗"* and
  click through to the program. *"When the whistle blows, the result isn't 'trust
  our app' — it's verified from TxLINE's own on-chain Merkle proof, the same one
  TxODDS anchors on Solana."*

**[1:35–1:45] Close**
- Point at "Host a branded room": *"Rooms are the product — sponsored sweepstakes,
  prize pools, branded themes. Zero-friction to play, provably fair on Solana,
  live on TxLINE's World Cup feed."*
- End on the moving win-prob bar.

---

### Before you record
- If you want the leaderboard shared across real devices (not just tabs), do the
  90-second KV step in `SETUP-KV.md` first — otherwise demo it with two tabs
  (still convincing) and mention "one env var makes it durable across devices."
- Keep it under 2 minutes. Show real data moving; don't over-narrate.
