import './globals.css'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' })

export const metadata = {
  title: 'Fan Zone — Final Sweepstake, live from TxLINE',
  description: 'Spin up a World Cup sweepstake room: live win-probability from TxLINE odds, a shared leaderboard, and predictions that grade on the real result.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} ${mono.variable} font-sans`}>{children}</body>
    </html>
  )
}
