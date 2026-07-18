import './globals.css'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' })

export const metadata = {
  metadataBase: new URL('https://fanzone-txline.vercel.app'),
  title: 'Fan Zone — Final Sweepstake, live from TxLINE',
  description: 'Spin up a World Cup sweepstake room: live win-probability from TxLINE odds, a shared leaderboard, and predictions that grade on the real result.',
  applicationName: 'Fan Zone',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Fan Zone — Final Sweepstake',
    description: 'Call the Final, bring your group. Live win-probability from TxLINE odds + a shared sweepstake leaderboard.',
    url: 'https://fanzone-txline.vercel.app',
    siteName: 'Fan Zone',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fan Zone — Final Sweepstake',
    description: 'Call the Final, bring your group. Live win-probability from TxLINE odds.',
  },
}

export const viewport = {
  themeColor: '#020617',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} ${mono.variable} font-sans`}>{children}</body>
    </html>
  )
}
