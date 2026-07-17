/** @type {import('next').NextConfig} */
// NOTE: no `output: 'export'`. Fan Zone runs as a Next.js server on Vercel so that
// TxLINE is proxied server-side (token stays server-only, and a CloudFront blip on
// one request can't leave the page stuck on "Loading fixtures…").
module.exports = { images: { unoptimized: true }, typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true } }
