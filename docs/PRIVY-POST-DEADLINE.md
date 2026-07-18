# Privy embedded wallets — WIRED, flag-gated, one step to activate

Optional email sign-in → a real, **non-custodial** embedded Solana wallet (no
seed phrase), so a fan's calls are tagged to **their own** wallet on-chain.

**Status: fully wired into the codebase**, code-split and flag-gated by
`NEXT_PUBLIC_PRIVY_APP_ID`. With it unset (current prod), none of `@privy-io` is
bundled — the app ships the same ~97 kB and behaves exactly as today. Set the App
ID and the Privy chunk lazy-loads and the sign-in chip appears.

Files: `src/components/privy-context.tsx` (light context + `PrivySignIn`),
`src/components/privy-provider.tsx` (heavy `PrivyProvider`, lazy-loaded),
`src/components/privy.tsx` (loader + re-exports). Wired in `layout.tsx`
(`PrivyLoader`), `SweepstakeRoom.tsx` (`PrivySignIn` + `owner` tag), and
`/api/commit` (memo carries `owner=<wallet>`).

## Activate (2 minutes)

1. **dashboard.privy.io** → sign up → **Create app** → Solana → copy the **App ID**.
2. Set it and redeploy:
   ```bash
   cd ~/fanzone-txline
   vercel env add NEXT_PUBLIC_PRIVY_APP_ID production   # paste the App ID
   vercel --prod
   ```
3. Verify: the room bar shows **"Sign in to own your calls"**; sign in with email;
   the chip flips to **"you own your calls · <addr>"**; lock a call and the on-chain
   memo now carries `owner=<your wallet>`.

## Next step (optional, needs each user's wallet funded with devnet SOL)

Make the user's embedded wallet **sign the commit tx itself** (fully user-owned,
not just tagged): use `useSignAndSendTransaction` from `@privy-io/react-auth/solana`,
build a Memo tx with `feePayer = user wallet`, auto-fund ~0.01 SOL from the FZ
signer on first use, and keep the current server-custodial `/api/commit` as the
fallback so it never blocks a lock. (`useFundWallet` from the Privy Solana module
can drive the funding.)

## Note on the install

`@privy-io/react-auth` + `@solana/kit` need `--legacy-peer-deps`, plus these
transitive peers the flag skipped: `@solana-program/{memo,token,system,compute-budget}`.
Two optional integrations we don't use (`@stripe/crypto`, `@farcaster/mini-app-solana`,
`@react-native-async-storage/async-storage`) are stubbed to `false` in
`next.config.js` so the bundler doesn't choke on them.
