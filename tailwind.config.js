/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // display = editorial serif (Fraunces)
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
        serif: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // editorial ink-on-near-black; warmth carried by the text, not the bg
        ink: {
          DEFAULT: '#f3f0ea', // warm off-white primary text
          soft: '#c9c6bf',
          mute: '#8f8d86',
          faint: '#5c5b56',
        },
        paper: {
          950: '#0b0b0d', // near-black body
          900: '#111114', // raised surface
          800: '#1a1a1e',
          700: '#26262b',
        },
        pitch: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
      },
    },
  },
  plugins: [],
}
