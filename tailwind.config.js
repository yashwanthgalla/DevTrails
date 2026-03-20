/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2f3035',
          text: '#111111',
          muted: '#555555',
        },
      },
      boxShadow: {
        soft: '0 20px 60px rgba(17, 17, 17, 0.08)',
        card: '0 14px 34px rgba(17, 17, 17, 0.08)',
      },
      borderRadius: {
        '3xl': '1.75rem',
      },
      maxWidth: {
        shell: '1100px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}