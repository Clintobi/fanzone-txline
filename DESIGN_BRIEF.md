# DESIGN_BRIEF.md — Fan Zone

> Craft bar (Step 1): **PrizePicks** (`ref-prizepicks/`). We match its *craft level* —
> typographic confidence, spacing rhythm, tactile surfaces, restraint — and copy **none**
> of its identity, colors, fonts, or content. This is a visual-layer redesign of a live app:
> all logic, props, handlers, routes, and on-chain wiring stay intact.

---

## 0. The one big call (confirm before we build)

**We pivot from austere editorial-serif (Fraunces + hairline) → premium broadcast sports-game.**
Loud wide-grotesk display, tactile team-tinted match cards, big tabular numbers, two hard-roled
accents on near-black. This *reverses* the earlier serif direction — on purpose, because you chose
the PrizePicks pick'em craft as the bar. If you want to keep any serif DNA, say so now; otherwise
the brief below is all grotesk.

**Brand:** Fan Zone — a no-wallet World Cup sweepstake room. Provably-fair on Solana (green =
"live / you're right / on-chain confirmed"). No logo file exists → we design a **wordmark**, not
a logo lockup.

---

## 1. Fonts (Google, with fallbacks) — Banned: Inter, Roboto, Arial, Space Grotesk, Poppins

| Role | Font | Weights | Fallback stack | Used for |
|---|---|---|---|---|
| **Display** | **Archivo Expanded** | 800, 900 | `'Archivo', 'Arial Narrow', system-ui, sans-serif` | Hero headline, section headlines, the scoreline, big numbers |
| **Body / UI** | **Archivo** (normal width) | 400, 500, 600, 700 | `system-ui, sans-serif` | All UI text, buttons, body, labels, leaderboard |
| **Mono** | **Geist Mono** (fallback JetBrains Mono) | 400, 600 | `ui-monospace, 'JetBrains Mono', monospace` | On-chain hashes, tx ids, timestamps, technical labels, fine print, kicker labels |

- One grotesk **superfamily** (Archivo) carries display + body — contrast comes from **width + weight**
  (Expanded 900 vs normal 400), not from pairing two different sans (which is a slop tell). Mono is
  the deliberate third voice, reserved for anything technical/on-chain.
- Display always ships `font-optical-sizing` off, `font-feature-settings: 'tnum'` on for numerals.

## 2. Palette — exact hexes, roles, coverage. Accent is sparse.

| Token | Hex | Role | Coverage |
|---|---|---|---|
| `--bg` | `#0A0B0F` | Page background (cool near-black) | **~68%** |
| `--surface` | `#12141A` | Cards, panels (raised) | ~14% |
| `--surface-2` | `#0D0F14` | Inset chips, inputs, wells | ~5% |
| `--line` | `#23262E` | Hairline borders, dividers | — |
| `--line-strong` | `#2E323C` | Emphasized borders, focus track | — |
| `--ink` | `#F4F6F8` | Primary text, big numbers | ~8% |
| `--ink-mute` | `#9BA1AC` | Secondary text (passes 4.5:1 on `--bg`) | ~3% |
| `--ink-faint` | `#5A606B` | Tertiary / large-only, disabled | <1% |
| `--accent` | `#3EE97F` | **Action + live number + win + on-chain-OK.** CTAs, active pick, win-prob fill, links, focus ring | **~6%** |
| `--accent-ink` | `#06210F` | Text/icon on `--accent` fills | — |
| `--live` | `#FF5A46` | **LIVE only** — the pulse dot + "LIVE" tag. Never a CTA. | <1% |
| `--gold` | `#EBBB54` | **Champion / settled / streak only** — winner highlight, streak flame, "SETTLED ✓" | <1% |

**Team tinting:** each match side gets a low-alpha **radial glow** from its flag's dominant hue
(e.g. ESP red `rgba(198,40,40,.18)`, ARG blue `rgba(60,120,220,.18)`) behind its half of the card.
That is the only place hue enters outside the accents.

**Bans:** no purple/blue gradients (that's *their* identity + a slop tell), no gray text on colored
fills, no accent as a large fill area (it stays a highlight).

## 3. Type scale (px), tracking, line-height

| Token | Size (clamp) | Weight | Tracking | Line-height |
|---|---|---|---|---|
| Hero `h1` | `clamp(48, 92)` | 900 exp | `-0.025em` | `0.92` |
| **Scoreline** (data) | `clamp(64, 128)` | 800 | `-0.02em` | `0.9` |
| Section `h2` | `clamp(30, 54)` | 800 | `-0.02em` | `1.0` |
| `h3` | `clamp(20, 26)` | 700 | `-0.01em` | `1.1` |
| Big stat number | `clamp(28, 44)` | 800 tnum | `-0.01em` | `1.0` |
| Body-lg | `18` | 400/500 | `0` | `1.5` |
| Body | `15` | 400 | `0` | `1.55` |
| Small | `13` | 500 | `0` | `1.5` |
| Kicker / label (mono) | `11–12` | 600 | `+0.16em` uppercase | `1` |
| Fine print (mono) | `11` | 400 | `+0.02em` | `1.45` |

- Body/prose capped at **68ch**. `text-wrap: balance` on h1–h3, `pretty` on paragraphs.
- All-caps labels always carry `+0.14–0.16em` tracking. Numerals always tabular.

## 4. Spacing & rhythm — 4px base grid

- **Scale:** 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
- **Section vertical rhythm:** `py clamp(64, 120)`. Headlines get air above them (min 48px).
- **Container:** max-width `1120px`, gutter `20px` (mobile) → `24px`.
- **Card padding:** 20 (mobile) → 24. **Radius:** cards `20px`, chips/inputs `12px`,
  buttons `14px`, pills/badges `full`. Hexagon flag badge is a true hexagon (clip-path).
- Spacing *means* grouping: 4–8 within a unit, 12–16 between units, 32–48 between blocks,
  64–120 between sections.

## 5. THE signature hero element — "The Live Match Ticket"

One concrete object, and it gets 50% of the design effort. It **is** the hero and the product:

- A single tactile card, radius 20, on `--surface` with a hairline `--line` border and a soft
  ambient shadow (no blur-glass). Split into two halves, each carrying its **team's radial tint**.
- **Two hexagon country-flag badges** (clip-path hexagon, 1px metallic `--line-strong` rim, flag
  fill, subtle inner highlight) flank the centre.
- **Centre: the massive tabular scoreline** (`clamp(64,128)`, Archivo Expanded 800) — e.g. `1 – 2`,
  the `–` in `--ink-faint`. Digits count up on change.
- **Under it: the live win-probability bar** as a *momentum split* — three segments
  (Home / Draw / Away) whose widths are the de-margined probabilities, Home in `--accent`, Draw in
  `--ink-faint`, Away in a neutral cool tone; the leading side's **% shown as a big tabular number**
  above its segment. A red `--live` pulse dot + mono `LIVE · 72'` tag sits top-left.
- **The pick affordance = broadcast split buttons** (echo of PrizePicks' Less/More): `HOME · DRAW ·
  AWAY` as three tactile segments; selected fills `--accent` with `--accent-ink` label; below,
  an optional exact-score stepper. "Lock it in" is the one prominent `--accent` CTA.

Nothing else on the page competes with this card. Kickoff/odds/score are all real TxLINE data.

## 6. Image / imagery treatment — one rule, applied everywhere

- **Teams are never photos — always the hexagon flag badge** (same shape, same rim, same tint logic).
  This is the single consistent treatment across hero, leaderboard, share card, and match list.
- If any background imagery is used (stadium/pitch), it is **one treatment only:** duotone
  `--bg → --accent`, ≤12% opacity, sits behind content, never decorative-on-top.
- No stock photography, no emoji standing in for icons — icons are a single hairline SVG set.

## 7. Section-by-section intent (real content, no lorem)

1. **Header** — wordmark "Fan Zone" (Archivo Expanded 800) + mono `SWEEPSTAKE` tag; right: mono
   `TxLINE · LIVE` status + the room/sign-in control. Hairline bottom border.
2. **Hero** — left: tiny mono kicker (`LIVE WIN-PROBABILITY · WORLD CUP`, used **once** here, not on
   every section), huge `h1` ("Call the Final. / Bring your group."), one-line deck, primary CTA.
   Right: **The Live Match Ticket** (§5).
3. **The room** — room bar (share link, alias), then the Match Ticket in full play mode + pick form.
4. **Leaderboard** — hairline-divided **numbered** rows (rank in mono, alias, flag badge of their
   call, streak flame in `--gold`, points big tabular). Not cards.
5. **Provably-fair** — mono-forward panel: the on-chain commit tx + the TxLINE Merkle root, framed
   as a *feature* in mono, calm not scary ("Locked on Solana · settles from TxLINE's proof").
6. **Footer** — a *designed* section: wordmark, one line on what Fan Zone is, `Solana · TxLINE`
   mono tag, hairline top.

## 8. Motion (spec now, wired in Steps 4/7)

- Ease-out (quart/expo), 150–300ms micro, 300–500ms section. No bounce/elastic.
- Count-up on scoreline & win-prob %; win-prob segments animate width on update; pick buttons have a
  pressed spring; leaderboard rows stagger in. Live pulse dot breathes.
- `@media (prefers-reduced-motion: reduce)` → crossfade/instant everywhere. Content is visible by
  default (never gated behind a reveal class).

## 9. Banned tells (match-and-refuse)

Emoji-as-icons · glassmorphism / backdrop-blur · purple-blue gradients · gradient text ·
cards-in-cards / nested cards · three-equal-icon-tiles · centered-everything (only section intros
center) · gray text on colored bg · side-stripe (>1px) accent borders · the hero-metric template ·
a tracked uppercase eyebrow on *every* section (kicker appears at most twice) · numbered `01/02/03`
section markers · arbitrary spacing/radius off the scale · text that overflows its container at any
breakpoint.

## 10. Responsive

- Mobile-first. Breakpoints: `480 / 768 / 1120`.
- Hero stacks (ticket under headline) < 900px; scoreline clamps down; flag badges shrink but keep
  the hexagon; split pick buttons stay full-width tappable (≥44px). Leaderboard: rank+alias+points
  stay, secondary stats hide < 480px. Test every headline string for overflow at 390px.

---

*Craft target on disk:* `ref-prizepicks/prizepicks-design/screens/scroll/*.png` (the quality bar for
the Step 5 side-by-side) and `references/` (tokens, motion, components). Match the **level**, not the look.
