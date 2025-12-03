/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        pink: {
          50: '#fef1f7',
          100: '#fee5f0',
          200: '#fecce3',
          300: '#ffa3ca',
          400: '#ff6ba8',
          500: '#fb3d88',  // Main brand pink - warmer
          600: '#ec1c68',  // Darker warm pink
          700: '#cd0f52',
          800: '#aa1045',
          900: '#8d123c',
        },
      },
    },
  },
  plugins: [],
}