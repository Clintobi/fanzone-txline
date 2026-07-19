'use client'

// Light context — NO @privy-io import, so anything importing this (the room UI,
// the sign-in chip) stays out of the heavy Privy bundle. The heavy provider in
// privy-provider.tsx populates this context, and is only loaded when an App ID
// is configured (see privy.tsx).

import { createContext, useContext } from 'react'

export type PrivyBridge = {
  ready: boolean
  authenticated: boolean
  address: string | null
  email: string | null
  login: () => void
  logout: () => void
}

export const PrivyBridgeContext = createContext<PrivyBridge | null>(null)
export const usePrivyBridge = () => useContext(PrivyBridgeContext)

const short = (a: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : 'wallet')

// Sign-in chip — renders nothing when Privy is disabled or not yet ready.
export function PrivySignIn() {
  const b = usePrivyBridge()
  if (!b || !b.ready) return null
  if (!b.authenticated) {
    return (
      <button onClick={b.login}
        className="font-mono text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border border-accent-800/70 text-accent-300 hover:bg-accent hover:text-accent-ink transition-colors">
        Sign up with Solana
      </button>
    )
  }
  return (
    <button onClick={b.logout} className="font-mono text-[10px] uppercase tracking-[0.08em] px-2.5 py-1 rounded-full border border-accent-900/60 text-accent-300 hover:border-accent-700 transition-colors" title={`${b.email || 'Embedded Solana wallet'} · select to sign out`}>
      wallet-owned · {short(b.address)}
    </button>
  )
}
