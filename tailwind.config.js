/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        forest: {
          500: '#228B22',
          600: '#1a6b1a',
          700: '#145214',
        },
        mint: {
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
        'glow': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
}
