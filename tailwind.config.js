/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#1a1a1a',
        card: '#2d2d2d',
        'card-hover': '#383838',
        text: '#e0e0e0',
        'text-muted': '#888888',
        accent: '#00ff88',
        'accent-dark': '#00cc6a',
        danger: '#ff4444',
        'danger-dark': '#cc3333',
        warning: '#ffaa00',
        border: '#404040',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
