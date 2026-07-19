'use client'

// Heavy Privy provider — imports @privy-io + @solana/kit. Loaded ONLY when
// NEXT_PUBLIC_PRIVY_APP_ID is set (dynamically imported from privy.tsx), so it
// never weighs down the default bundle.

import { type ReactNode } from 'react'
import { PrivyProvider, useLogin, usePrivy } from '@privy-io/react-auth'
import { useWallets, toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import { PrivyBridgeContext, type PrivyBridge } from './privy-context'

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID as string
const RPC = process.env.NEXT_PUBLIC_FZ_DEVNET_RPC || 'https://api.devnet.solana.com'

export function PrivyGate({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        appearance: { walletChainType: 'solana-only', theme: 'dark', accentColor: '#3EE97F' },
        loginMethods: ['email', 'wallet'],
        // Privy v3: embedded-wallet creation is per-chain. This app is Solana-only,
        // so a top-level createOnLogin creates NOTHING here — it must be nested under
        // `solana` or no embedded wallet is minted on login.
        embeddedWallets: { solana: { createOnLogin: 'all-users' } },
        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc(RPC),
              rpcSubscriptions: createSolanaRpcSubscriptions(RPC.replace(/^http/, 'ws')),
            },
          },
        },
      }}
    >
      <Bridge>{children}</Bridge>
    </PrivyProvider>
  )
}

function Bridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy()
  const { login } = useLogin()
  const { wallets } = useWallets()
  const wallet = wallets.find((w: any) => w.standardWallet?.name === 'Privy') || wallets[0]
  const value: PrivyBridge = {
    ready,
    authenticated,
    address: (wallet as any)?.address ?? null,
    email: (user?.email?.address as string) ?? null,
    login: () => login(),
    logout,
  }
  return <PrivyBridgeContext.Provider value={value}>{children}</PrivyBridgeContext.Provider>
}
