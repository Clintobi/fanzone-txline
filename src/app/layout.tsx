import './globals.css'
import { Archivo, JetBrains_Mono } from 'next/font/google'
import { PrivyLoader } from '@/components/privy'

// Broadcast sports-game craft: one grotesk superfamily (Archivo, variable with a
// width axis) carries both the wide+heavy display and the clean UI body — contrast
// comes from width/weight, not from pairing two different sans. A mono is the
// deliberate third voice for on-chain data, timestamps, and technical labels.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-sans', display: 'swap' })
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
  themeColor: '#0A0B0F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${mono.variable} font-sans`}>
        <PrivyLoader>{children}</PrivyLoader>
      </body>
    </html>
  )
}
