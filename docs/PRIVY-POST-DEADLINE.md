# Privy embedded wallets — staged, ready to activate (post-deadline)

Goal: optional email sign-in → a real, **non-custodial** embedded Solana wallet
(no seed phrase) so a fan's calls are tagged to **their own** wallet on-chain.
Fully flag-gated by `NEXT_PUBLIC_PRIVY_APP_ID`: unset ⇒ the app behaves exactly
as it does today (server-custodial commits). This was built and code-complete;
it's kept as a doc only because Privy's npm dep tree wouldn't install cleanly on
the build machine under the deadline (killed mid-resolve twice). Do this when you
have a few clean minutes.

## 1. Install (use --legacy-peer-deps; the tree is large)

```bash
cd ~/fanzone-txline
npm install @privy-io/react-auth @solana/kit --legacy-peer-deps
```

## 2. Get an App ID (2 min)
dashboard.privy.io → sign up → **Create app** → Solana, devnet → copy the **App ID**.

```bash
vercel env add NEXT_PUBLIC_PRIVY_APP_ID production   # paste the App ID
```

## 3. Add `src/components/privy.tsx`

```tsx
'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { PrivyProvider, useLogin, usePrivy } from '@privy-io/react-auth'
import { useWallets, toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID
const RPC = process.env.NEXT_PUBLIC_FZ_DEVNET_RPC || 'https://api.devnet.solana.com'

export type PrivyBridge = {
  ready: boolean; authenticated: boolean; address: string | null
  email: string | null; login: () => void; logout: () => void
}
const Ctx = createContext<PrivyBridge | null>(null)
export const usePrivyBridge = () => useContext(Ctx)

export function PrivyGate({ children }: { children: ReactNode }) {
  if (!APP_ID) return <>{children}</>
  return (
    <PrivyProvider appId={APP_ID} config={{
      appearance: { walletChainType: 'solana-only', theme: 'dark', accentColor: '#22c55e' },
      loginMethods: ['email', 'wallet'],
      embeddedWallets: { createOnLogin: 'all-users' },
      externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
      solana: { rpcs: { 'solana:devnet': {
        rpc: createSolanaRpc(RPC),
        rpcSubscriptions: createSolanaRpcSubscriptions(RPC.replace(/^http/, 'ws')),
      } } },
    }}><Bridge>{children}</Bridge></PrivyProvider>
  )
}

function Bridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy()
  const { login } = useLogin()
  const { wallets } = useWallets()
  const wallet = wallets.find((w: any) => w.standardWallet?.name === 'Privy') || wallets[0]
  const value: PrivyBridge = {
    ready, authenticated,
    address: (wallet as any)?.address ?? null,
    email: (user?.email?.address as string) ?? null,
    login: () => login(), logout,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

const short = (a: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : 'wallet')
export function PrivySignIn() {
  const b = usePrivyBridge()
  if (!b || !b.ready) return null
  if (!b.authenticated) return (
    <button onClick={b.login} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:text-white transition">
      Sign in to own your calls
    </button>
  )
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pitch-900/50 text-pitch-300" title={b.email || 'your embedded wallet'}>
      you own your calls · {short(b.address)}
    </span>
  )
}
```

## 4. Wire it (3 small diffs)

**`src/app/layout.tsx`** — wrap the body:
```tsx
import { PrivyGate } from '@/components/privy'
// ...
<body className={...}><PrivyGate>{children}</PrivyGate></body>
```

**`src/components/SweepstakeRoom.tsx`**:
```tsx
import { usePrivyBridge, PrivySignIn } from '@/components/privy'
// inside the component, with the other hooks:
const privy = usePrivyBridge()
// in the room bar, after the streak chip:
<PrivySignIn />
// in lockIn's /api/commit body, add:  owner: privy?.address || ''
```

**`src/app/api/commit/route.ts`** — tag the memo with the owner:
```ts
const owner = (b.owner || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 44)
const payload = `Fan Zone call | room=${room} | ${alias} calls ${fixture}: ${pick}${exact ? ` (${exact})` : ''} | locked ${stamp}${owner ? ` | owner=${owner}` : ''}`
```

## 5. Test, then deploy
`npm run build` → `vercel --prod`. Sign in with email, confirm the chip shows
`you own your calls · <addr>`, lock a call, and check the memo carries `owner=`.

## Next step beyond this (needs each user's wallet funded with devnet SOL)
Make the user's embedded wallet **sign the commit tx itself** (fully user-owned,
not just tagged): use `useSignAndSendTransaction` from `@privy-io/react-auth/solana`,
build a Memo tx with `feePayer = user wallet`, and auto-fund the wallet ~0.01 SOL
from the FZ signer on first use. Keep the current server-custodial `/api/commit`
as the fallback so it never blocks a lock.
