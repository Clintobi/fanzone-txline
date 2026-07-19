/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        // one grotesk superfamily; .font-display adds width + weight in CSS
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Arial Narrow', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        // ── semantic tokens (broadcast sports-game, near-black + sparse accent) ──
        bg: '#0A0B0F',
        surface: { DEFAULT: '#12141A', 2: '#0D0F14', raised: '#181B22' },
        line: { DEFAULT: '#23262E', strong: '#2E323C' },
        ink: {
          DEFAULT: '#F4F6F8', // primary text + big numbers
          soft: '#C9CED6',
          mute: '#9BA1AC', // secondary — passes 4.5:1 on bg
          faint: '#5A606B', // tertiary / large-only
        },
        accent: {
          DEFAULT: '#3EE97F', // action + live number + win + on-chain-OK
          ink: '#06210F', // text on accent fills
          100: '#D6FBE4', 200: '#A8F6C6', 300: '#7DF3A6', 400: '#52ED8B',
          500: '#3EE97F', 600: '#23C766', 700: '#1B9E51', 800: '#166A3B',
          900: '#0E3A22', 950: '#06210F',
        },
        live: '#FF5A46', // LIVE pulse only — never a CTA
        gold: { DEFAULT: '#EBBB54', soft: '#F3D488', ink: '#2A2008' }, // champion / settled / streak only

        // ── backward-compat aliases (old names → new values) ──
        paper: { 950: '#0A0B0F', 900: '#12141A', 800: '#181B22', 700: '#24272F' },
        pitch: {
          50: '#EAFEF1', 100: '#D6FBE4', 200: '#A8F6C6', 300: '#7DF3A6', 400: '#52ED8B',
          500: '#3EE97F', 600: '#23C766', 700: '#1B9E51', 800: '#166A3B', 900: '#0E3A22', 950: '#06210F',
        },
      },
    },
  },
  plugins: [],
}
