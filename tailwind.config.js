/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0c0d0e',
          card: '#16181a',
          border: '#26292d',
          hover: '#212429',
          muted: '#8b949e',
          subtle: '#121416',
        },
        emerald: {
          accent: '#10b981',
          glow: 'rgba(16, 185, 129, 0.15)',
        },
        cyan: {
          accent: '#06b6d4',
          glow: 'rgba(6, 182, 212, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['monospace'],
      }
    },
  },
  plugins: [],
}
