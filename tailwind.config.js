/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Candy Wishes" palette: pink everywhere, mustard-gold accents, white cards
        plum: { DEFAULT: '#5b2440', soft: '#8a4d68', faint: '#b8899d' },
        lav: { 50: '#fff4f7', 100: '#fde6ee', 200: '#f9cfdd', 300: '#f3aec5', 400: '#ea89aa', 500: '#dc6690', 600: '#c24a77' },
        blush: { 50: '#fff3f7', 100: '#fde2ec', 200: '#fbc7da', 300: '#f6a3c0', 400: '#ef7fa7', 500: '#e05f8e' },
        sky: { 50: '#fff8ee', 100: '#fdefd9', 200: '#f8deb3', 300: '#f2c780', 400: '#d99a2b' },
        gold: { 100: '#fbecc9', 300: '#f2c46b', 400: '#e5a634', 500: '#c9861f', 600: '#a86d17' },
        cream: { 50: '#fffbfc', 100: '#fff4f6', 200: '#fde8ee' },
        mint: { 100: '#e3f5ec', 300: '#a5dcc1', 500: '#3c9d74' },
        peach: { 100: '#ffeadf', 300: '#ffc4a3' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', '"El Messiri"', '"IBM Plex Sans Arabic"', 'serif'],
        script: ['"Aref Ruqaa"', '"El Messiri"', 'serif'],
      },
      boxShadow: {
        soft: '0 12px 32px -14px rgba(194, 74, 119, 0.35)',
        glow: '0 8px 20px -8px rgba(212, 146, 42, 0.6)',
      },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        twinkle: { '0%,100%': { opacity: '.35', transform: 'scale(.9)' }, '50%': { opacity: '1', transform: 'scale(1.1)' } },
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        wave: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite',
        twinkle: 'twinkle 2.6s ease-in-out infinite',
        rise: 'rise .45s ease-out both',
        wave: 'wave 6s linear infinite',
      },
    },
  },
  plugins: [],
};
