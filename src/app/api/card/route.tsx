import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

// Personalized "I called it" share card. A locked call generates a link to /call
// whose OG image is this route — so a shared call unfurls in X/iMessage as
// "<alias> called <pick> · verified on-chain", tapping through to join the room.
// This is the no-wallet viral loop (works for everyone, unlike a wallet Blink).
export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

const FLAG: Record<string, string> = {
  France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Argentina: '🇦🇷', Brazil: '🇧🇷',
  Australia: '🇦🇺', Vietnam: '🇻🇳', Myanmar: '🇲🇲', 'New Zealand': '🇳🇿', India: '🇮🇳',
  Liechtenstein: '🇱🇮', Gibraltar: '🇬🇮',
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const alias = (p.get('by') || 'A fan').slice(0, 24)
  const pick = (p.get('pick') || '').slice(0, 24)
  const fixture = (p.get('fx') || 'the Final').slice(0, 48)
  const exact = (p.get('sc') || '').slice(0, 8)
  const verdict = (p.get('v') || 'locked').toLowerCase() // locked | won | lost
  const flag = FLAG[pick] || (pick.toLowerCase() === 'draw' ? '🤝' : '⚽')

  const accent = verdict === 'won' ? '#4ade80' : verdict === 'lost' ? '#94a3b8' : '#e2e8f0'
  const headline = verdict === 'won' ? 'CALLED IT.' : verdict === 'lost' ? 'Called it.' : 'My call is in.'
  const sub = verdict === 'won'
    ? `${alias} called it right`
    : verdict === 'lost' ? `${alias} took the swing` : `${alias} locked their call`

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: 72,
        background: 'linear-gradient(135deg,#020617 0%,#052e16 100%)', color: '#f8fafc', fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, background: 'linear-gradient(135deg,#4ade80,#16a34a)', color: '#052e16' }}>FZ</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>Fan Zone · Final Sweepstake</div>
          <div style={{ marginLeft: 'auto', fontSize: 22, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 8 }}>🔒 on-chain</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 34, color: '#94a3b8' }}>{sub}</div>
          <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -3, color: accent, lineHeight: 1 }}>{headline}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, fontSize: 40, fontWeight: 700 }}>
            <span style={{ fontSize: 60 }}>{flag}</span>
            <span>{pick || 'their pick'}{exact ? <span style={{ color: '#94a3b8', fontWeight: 500 }}> · {exact}</span> : null}</span>
            <span style={{ fontSize: 26, color: '#64748b', fontWeight: 500 }}>— {fixture}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 999, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.28)', color: '#4ade80' }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: '#4ade80', display: 'flex' }} />
            verified on-chain
          </span>
          <span>Call the Final. Bring your group. → fanzone-txline.vercel.app</span>
        </div>
      </div>
    ),
    size,
  )
}
