/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#07130e',
          900: '#0b1e16',
          850: '#0f261c',
          800: '#143527',
          700: '#1d4b38',
          600: '#2d6a4f',
          500: '#38a169',
          400: '#48bb78',
          300: '#6ee7b7',
          200: '#a7f3d0',
          100: '#d8f3dc',
          50: '#f4f7f5',
        },
        dark: {
          bg: '#080f0c',
          card: '#0f1d17',
          cardHover: '#14271f',
          surface: '#12221b',
          input: '#0b1612',
          border: 'rgba(52, 211, 153, 0.15)',
          borderHover: 'rgba(52, 211, 153, 0.35)',
        },
        amberGold: {
          DEFAULT: '#d97706',
          hover: '#b45309',
          light: '#fef3c7',
          glow: '#fbbf24',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Noto Sans Devanagari', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'pill': '9999px',
      }
    },
  },
  plugins: [],
}
