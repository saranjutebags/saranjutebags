/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FBF9F5',
        surface: '#FFFFFF',
        sand: {
          50: '#FAF6EF',
          100: '#F3ECDF',
          200: '#E7DBC6',
          300: '#D8C4A4',
          400: '#C8A87C',
          500: '#B58F5F',
          600: '#96724A',
        },
        forest: {
          50: '#EEF4F0',
          100: '#D7E6DC',
          200: '#AFCCBB',
          300: '#7FAB92',
          400: '#4F8A6C',
          500: '#2F6B4F',
          600: '#245240',
          700: '#1B3C30',
          800: '#132A22',
          900: '#0D1D18',
        },
        ink: {
          DEFAULT: '#1A1C1A',
          soft: '#4A5450',
          muted: '#7A847F',
          line: '#E6E2D9',
        },
        clay: '#B4553C',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(26,28,26,0.04), 0 8px 24px -12px rgba(26,28,26,0.12)',
        lift: '0 2px 4px rgba(26,28,26,0.04), 0 24px 48px -20px rgba(26,28,26,0.22)',
        glass: '0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 40px -16px rgba(19,42,34,0.24)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}