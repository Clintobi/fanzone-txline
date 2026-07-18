'use client'

import dynamic from 'next/dynamic'
import { type ReactNode } from 'react'

// Public entry: the room UI imports the light context bits from here; the heavy
// Privy provider is only pulled in (as a separate lazy chunk) when an App ID is
// configured. With NEXT_PUBLIC_PRIVY_APP_ID unset, none of @privy-io is bundled
// and the app ships exactly the same bytes as before.

export { usePrivyBridge, PrivySignIn } from './privy-context'
export type { PrivyBridge } from './privy-context'

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID
export const privyEnabled = Boolean(APP_ID)

const PrivyGate = APP_ID
  ? dynamic(() => import('./privy-provider').then(m => m.PrivyGate), { ssr: false })
  : null

export function PrivyLoader({ children }: { children: ReactNode }) {
  if (!PrivyGate) return <>{children}</>
  return <PrivyGate>{children}</PrivyGate>
}
