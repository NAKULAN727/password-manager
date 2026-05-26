/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/popup/**/*.{js,ts,jsx,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          light: '#F4D068',
          DEFAULT: '#D4AF37',
          dark: '#AA8C2C',
        },
        obsidian: {
          light: '#141B2D',
          DEFAULT: '#090D16',
          dark: '#05070B',
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%': { opacity: '0.3', transform: 'scale(1) translate(-50%, -50%)' },
          '100%': { opacity: '0.6', transform: 'scale(1.1) translate(-50%, -50%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
