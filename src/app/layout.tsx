import './globals.css'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import { PrivyLoader } from '@/components/privy'

// Editorial contrast axis: a high-contrast serif display (Fraunces) against a
// clean grotesk UI (Inter), with a mono for live data. Serif + sans is the
// heart of the magazine look.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const display = Fraunces({ subsets: ['latin'], weight: ['400', '500', '600', '700', '900'], style: ['normal', 'italic'], variable: '--font-display' })
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
  themeColor: '#0b0b0d',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} ${mono.variable} font-sans`}>
        <PrivyLoader>{children}</PrivyLoader>
      </body>
    </html>
  )
}
