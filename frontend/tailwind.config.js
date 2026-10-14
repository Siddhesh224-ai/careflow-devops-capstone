/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14242f',
        canvas: '#f5f7f6',
        brand: { 50: '#edfdf9', 100: '#d5f8f0', 500: '#159a8c', 600: '#0f7f75', 700: '#0f665f', 900: '#134e4a' },
      },
      boxShadow: { card: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px rgb(15 23 42 / 0.04)' },
    },
  },
  plugins: [],
}

