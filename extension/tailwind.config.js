/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/popup/**/*.{js,ts,jsx,tsx}",
    "./src/popup/Settings.tsx",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          base: '#0A0806',
          surface: '#141009',
          raised: '#1E160D',
        },
        accent: {
          primary: '#E8A020',
          secondary: '#B86A1A',
          glow: '#FF9A3C',
        },
        gold: '#D4AF37',
        border: '#2A1E10',
      },
    },
  },
  plugins: [],
}
