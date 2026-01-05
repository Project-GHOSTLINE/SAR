import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['var(--font-playfair)', 'Playfair Display', 'serif'],
        'sans': ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      colors: {
        'sar-green': '#22C55E',
        'sar-green-dark': '#16A34A',
        'sar-gold': '#F59E0B',
      },
    },
  },
  plugins: [],
}
export default config
