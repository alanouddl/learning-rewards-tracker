/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        plum: { DEFAULT: '#3f2d62', soft: '#6b5a8e', faint: '#9a8cb6' },
        lav: { 50: '#f6f2ff', 100: '#ece4ff', 200: '#ddd0fd', 300: '#c6b3f7', 400: '#a88ef0', 500: '#8b6fe0', 600: '#7358c7' },
        blush: { 50: '#fff3f7', 100: '#ffe4ee', 200: '#fdcade', 300: '#f9a8c7', 400: '#f27ea9', 500: '#e45d90' },
        sky: { 50: '#f1f8ff', 100: '#e0f0fd', 200: '#c4e2fa', 300: '#9dcdf4', 400: '#6fb2ea' },
        cream: { 50: '#fffdf8', 100: '#fff8ec', 200: '#fdefd6' },
        mint: { 100: '#dcf5ea', 300: '#9adcbf', 500: '#3fae83' },
        peach: { 100: '#ffe9dc', 300: '#ffc3a1' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        display: ['"El Messiri"', '"IBM Plex Sans Arabic"', 'serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(115, 88, 199, 0.25)',
        glow: '0 8px 24px -6px rgba(228, 93, 144, 0.45)',
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
