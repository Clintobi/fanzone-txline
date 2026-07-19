import { API_ORIGIN, API_TOKEN, guestJwt } from '@/lib/txline-server'
import { oddsFromLive, parseJson, parseSseBlock, scoreFromLive } from '@/lib/live.mjs'
import replay from '../../../../test/fixtures/fanzone-live-replay.json'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const encoder = new TextEncoder()
const headers = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
}

type Kind = 'odds' | 'scores'

function frame(event: string, value: unknown, id?: string) {
  return encoder.encode(`${id ? `id: ${id}\n` : ''}event: ${event}\ndata: ${JSON.stringify(value)}\n\n`)
}

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve()
  const timer = setTimeout(resolve, ms)
  signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const fixtureId = Number(url.searchParams.get('fixture'))
  const kind = url.searchParams.get('kind') as Kind
  const replayMode = url.searchParams.get('replay') === '1'

  if (!Number.isInteger(fixtureId) || fixtureId <= 0 || !['odds', 'scores'].includes(kind)) {
    return Response.json({ error: 'fixture must be a positive integer and kind must be odds or scores' }, { status: 400 })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const close = () => {
        if (closed) return
        closed = true
        try { controller.close() } catch {}
      }
      const send = (event: string, value: unknown, id?: string) => {
        if (closed || request.signal.aborted) return
        try { controller.enqueue(frame(event, value, id)) } catch { closed = true }
      }

      request.signal.addEventListener('abort', close, { once: true })

      if (replayMode) {
        send('status', { mode: 'replay', source: 'bundled TxLINE fixture', fixtureId })
        for (const item of replay.filter((entry) => entry.kind === kind)) {
          await wait(item.delayMs, request.signal)
          if (request.signal.aborted) break
          send(kind, {
            kind,
            payload: { ...item.payload, FixtureId: fixtureId },
            receivedAt: Date.now(),
          }, item.id)
        }
        send('status', { mode: 'replay-complete', fixtureId })
        close()
        return
      }

      if (!API_TOKEN) {
        send('status', { mode: 'unavailable', reason: 'TxLINE API token is not configured' })
        close()
        return
      }

      send('status', { mode: 'connecting', source: `TxLINE ${kind} SSE`, fixtureId })
      const jwt = await guestJwt()
      const upstreamController = new AbortController()
      request.signal.addEventListener('abort', () => upstreamController.abort(), { once: true })
      let heartbeat: ReturnType<typeof setInterval> | undefined
      let connectTimeout: ReturnType<typeof setTimeout> | undefined

      try {
        connectTimeout = setTimeout(() => upstreamController.abort(new Error('TxLINE SSE connection timed out')), 8_000)
        const response = await fetch(`${API_ORIGIN}/api/${kind}/stream`, {
          headers: {
            Accept: 'text/event-stream',
            Authorization: jwt ? `Bearer ${jwt}` : '',
            'X-Api-Token': API_TOKEN,
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
          signal: upstreamController.signal,
        })
        clearTimeout(connectTimeout)
        connectTimeout = undefined
        if (!response.ok || !response.body) throw new Error(`TxLINE stream returned ${response.status}`)

        send('status', { mode: 'live', source: `TxLINE ${kind} SSE`, fixtureId })
        heartbeat = setInterval(() => send('heartbeat', { at: Date.now() }), 15_000)

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (!request.signal.aborted) {
          const { value, done } = await reader.read()
          buffer += decoder.decode(value, { stream: !done })
          let boundary = buffer.match(/\r?\n\r?\n/)
          while (boundary?.index !== undefined) {
            const message = parseSseBlock(buffer.slice(0, boundary.index))
            buffer = buffer.slice(boundary.index + boundary[0].length)
            if (message?.data) {
              const payload = parseJson(message.data)
              const relevant = kind === 'odds'
                ? oddsFromLive(payload, fixtureId)
                : scoreFromLive(payload, fixtureId)
              if (relevant) send(kind, { kind, payload, receivedAt: Date.now() }, message.id)
            }
            boundary = buffer.match(/\r?\n\r?\n/)
          }
          if (done) break
        }
      } catch (error) {
        if (!request.signal.aborted) {
          send('status', { mode: 'unavailable', reason: error instanceof Error ? error.message : 'TxLINE stream failed' })
        }
      } finally {
        if (connectTimeout) clearTimeout(connectTimeout)
        if (heartbeat) clearInterval(heartbeat)
        upstreamController.abort()
        close()
      }
    },
  })

  return new Response(stream, { headers })
}
