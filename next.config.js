/** @type {import('next').NextConfig} */
// NOTE: no `output: 'export'`. Fan Zone runs as a Next.js server on Vercel so that
// TxLINE is proxied server-side (token stays server-only, and a CloudFront blip on
// one request can't leave the page stuck on "Loading fixtures…").
module.exports = {
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // Privy references optional integrations we don't use (Stripe onramp, Farcaster
    // mini-app). We only use email/wallet login, so stub these so the bundler doesn't
    // choke on unresolved optional peers.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@stripe/crypto': false,
      '@farcaster/mini-app-solana': false,
      '@react-native-async-storage/async-storage': false,
    }
    return config
  },
}
