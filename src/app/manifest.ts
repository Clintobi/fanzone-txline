import type { MetadataRoute } from 'next'

// Phone-first: installable second-screen companion.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fan Zone — Final Sweepstake',
    short_name: 'Fan Zone',
    description: 'World Cup sweepstake rooms with live win-probability from TxLINE.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
