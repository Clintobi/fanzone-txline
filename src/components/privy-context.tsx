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
        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:text-white transition">
        Sign in to own your calls
      </button>
    )
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pitch-900/50 text-pitch-300" title={b.email || 'your embedded wallet'}>
      you own your calls · {short(b.address)}
    </span>
  )
}
