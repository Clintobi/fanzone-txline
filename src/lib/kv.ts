// Tiny Redis-over-REST client for the shared sweepstake leaderboard.
// Uses Vercel KV / Upstash env vars if present (KV_REST_API_* or UPSTASH_REDIS_REST_*),
// otherwise falls back to a per-instance in-memory store so the app still runs locally.
// To make the board TRULY shared across users: Vercel dashboard → Storage → Create
// Database → KV (Upstash) → connect to this project → redeploy. Nothing else changes.

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
export const kvLive = Boolean(URL && TOKEN)

// in-memory fallback (a warm serverless instance shares this; not durable)
const mem = new Map<string, Map<string, number>>()

async function cmd(args: (string | number)[]): Promise<any> {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`kv ${args[0]} -> ${r.status}`)
  return (await r.json()).result
}

// record the best score for a member in a room's sorted set
export async function submitScore(room: string, member: string, score: number): Promise<void> {
  if (kvLive) { await cmd(['ZADD', `room:${room}`, 'GT', score, member]); return }
  const m = mem.get(room) || new Map<string, number>()
  m.set(member, Math.max(score, m.get(member) ?? 0))
  mem.set(room, m)
}

export type Row = { name: string; pts: number }
export async function leaderboard(room: string, top = 20): Promise<Row[]> {
  if (kvLive) {
    const flat: string[] = await cmd(['ZRANGE', `room:${room}`, 0, top - 1, 'REV', 'WITHSCORES'])
    const rows: Row[] = []
    for (let i = 0; i < flat.length; i += 2) rows.push({ name: flat[i], pts: Number(flat[i + 1]) })
    return rows
  }
  const m = mem.get(room)
  if (!m) return []
  return [...m.entries()].map(([name, pts]) => ({ name, pts })).sort((a, b) => b.pts - a.pts).slice(0, top)
}
