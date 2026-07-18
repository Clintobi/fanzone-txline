# Turn the leaderboard "shared" (90 seconds)

Fan Zone's room leaderboard works out of the box, but by default it uses a
per-instance in-memory store — so it is **not** shared across users/devices. The
in-app badge honestly shows `local (connect KV to share)` until you connect a KV
store. Do this once and every room becomes a real, cross-device shared board
(the badge flips to `shared leaderboard`). Nothing else in the code changes.

## Option A — Upstash Redis (free, ~90s)

1. Go to https://console.upstash.com → **Create Database** → Redis → any region → Free tier.
2. Open the database → **REST API** section → copy `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`.
3. From this repo, add them to the Vercel project and redeploy:

   ```bash
   vercel env add KV_REST_API_URL production      # paste the REST URL
   vercel env add KV_REST_API_TOKEN production     # paste the REST token
   vercel --prod                                   # redeploy
   ```

   (The code also accepts `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
   verbatim — see `src/lib/kv.ts`.)

4. Verify: `curl https://fanzone-txline.vercel.app/api/room?room=final` →
   the response `"shared"` flips from `false` to `true`.

## Option B — Vercel Marketplace

Vercel dashboard → your `fanzone-txline` project → **Storage** → **Create /
Connect Database** → pick a Redis (Upstash) provider → **Connect to Project**.
Vercel injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` automatically. Redeploy.

## How it's wired

`src/lib/kv.ts` reads `KV_REST_API_URL|UPSTASH_REDIS_REST_URL` +
`KV_REST_API_TOKEN|UPSTASH_REDIS_REST_TOKEN`. Present → a Redis sorted set per
room (`ZADD … GT`) drives a durable shared board. Absent → an honest in-memory
fallback, and the UI labels it `local` so nothing is overstated.
