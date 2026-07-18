import { ImageResponse } from 'next/og'

// Branded share card so an invited room link previews well — reinforcing the
// invite-a-friend social loop. Self-contained (no external assets/fonts).
export const runtime = 'edge'
export const alt = 'Fan Zone — Final Sweepstake, live from TxLINE'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '72px',
          background: 'linear-gradient(135deg, #020617 0%, #052e16 100%)',
          color: '#f8fafc', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800,
            background: 'linear-gradient(135deg,#4ade80,#16a34a)', color: '#052e16',
          }}>FZ</div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Fan Zone</div>
          <div style={{ marginLeft: 'auto', fontSize: 24, color: '#4ade80' }}>TxLINE · Solana</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 74, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Call the Final.
          </div>
          <div style={{ fontSize: 74, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: '#4ade80' }}>
            Bring your group.
          </div>
          <div style={{ fontSize: 30, color: '#94a3b8', marginTop: 8 }}>
            Live win-probability from TxLINE odds · a shared sweepstake your whole room plays in.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {[['🇫🇷', '51%'], ['Draw', '24%'], ['🏴󠁧󠁢󠁥󠁮󠁧󠁿', '25%']].map(([a, b], i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'center', fontSize: 26,
              padding: '12px 22px', borderRadius: 999,
              background: 'rgba(148,163,184,0.10)', border: '1px solid rgba(148,163,184,0.18)',
            }}>
              <span>{a}</span><span style={{ color: '#4ade80', fontWeight: 700 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
