/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sar-green': '#00874e',
        'sar-green-dark': '#006341',
        'sar-green-light': '#00a65a',
        'sar-gold': '#0ea5e9', // Modern cyan accent
        'sar-grey': '#f5f5f5',
        'sar-grey-dark': '#333333',
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
