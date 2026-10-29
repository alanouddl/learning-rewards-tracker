/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // all-pink palette: blush backgrounds, hot-pink accents, white cards
        plum: { DEFAULT: '#3b2230', soft: '#7a5566', faint: '#b495a3' },
        lav: { 50: '#fff5f8', 100: '#fde8ef', 200: '#fad2e0', 300: '#f5b3ca', 400: '#ee87aa', 500: '#e3588b', 600: '#c93d72' },
        blush: { 50: '#fff6f9', 100: '#fde9f0', 200: '#fbd3e1', 300: '#f7b1c9', 400: '#f083a8', 500: '#e5508a' },
        sky: { 50: '#fff7fa', 100: '#fdebf2', 200: '#f9d5e3', 300: '#f3b2ca', 400: '#d6336f' },
        // "gold" is the accent slot: now the hot pink from the reference
        gold: { 100: '#fde3ed', 300: '#f6a1c1', 400: '#ec5f94', 500: '#d6336f', 600: '#b8255b' },
        cream: { 50: '#fffafc', 100: '#fff3f7', 200: '#fde6ee' },
        mint: { 100: '#e6f6ee', 300: '#a9dcc3', 500: '#2f9469' },
        peach: { 100: '#ffeef0', 300: '#ffc9d0' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        display: ['"Amiri"', '"IBM Plex Sans Arabic"', 'serif'],
        script: ['"Aref Ruqaa"', '"El Messiri"', 'serif'],
      },
      boxShadow: {
        soft: '0 14px 36px -18px rgba(214, 51, 111, 0.35)',
        glow: '0 10px 22px -10px rgba(214, 51, 111, 0.75)',
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
