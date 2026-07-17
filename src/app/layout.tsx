import './globals.css'

export const metadata = {
  title: 'Fan Zone — Live World Cup with TxLINE',
  description: 'Real-time World Cup scores, live match events, and a predict-the-winner game powered by TxLINE.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
