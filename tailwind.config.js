/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — deep evergreen, centered on #1B4D3E
        green: {
          50: '#F2F6F4',
          100: '#E4EDE8',
          200: '#C9DCD2',
          300: '#A7C6B5',
          400: '#7FAE94',
          500: '#5E9277',
          600: '#3E7A63',
          700: '#1B4D3E',
          800: '#163F34',
          900: '#0C211C',
        },
        emerald: {
          50: '#EEF4F1',
          100: '#DCE9E2',
          200: '#BCD4C7',
          300: '#94B8A5',
          400: '#689981',
          500: '#3E7A63',
          600: '#1B4D3E',
          700: '#163F34',
          800: '#112F27',
          900: '#0C211C',
        },
        forest: {
          500: '#3E7A63',
          600: '#1B4D3E',
          700: '#163F34',
        },
        mint: {
          50: '#F2F6F4',
          100: '#E4EDE8',
          200: '#C9DCD2',
          300: '#A7C6B5',
          400: '#7FAE94',
          500: '#5E9277',
          600: '#3E7A63',
          700: '#1B4D3E',
          800: '#163F34',
          900: '#0C211C',
        },
        golden: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        charcoal: {
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'DM Sans', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow': '0 0 20px rgba(27, 77, 62, 0.3)',
      },
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
}
