/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Pastel Rainbow: pink + lilac + mint + butter + baby blue, white cards
        plum: { DEFAULT: '#35263f', soft: '#6e5d7c', faint: '#a698b3' },
        lav: { 50: '#f6f2ff', 100: '#ede6fb', 200: '#ddd1f6', 300: '#c7b6ee', 400: '#b39ddb', 500: '#9479cc', 600: '#7a5cb8' },
        blush: { 50: '#fff5f8', 100: '#fde8ef', 200: '#fbd0de', 300: '#f8b4cb', 400: '#f48fb1', 500: '#e0598d' },
        sky: { 50: '#eef8fe', 100: '#def2fd', 200: '#bfe6fb', 300: '#81d4fa', 400: '#3a9fd6' },
        // accent slot used by main buttons and highlights
        gold: { 100: '#fde4ee', 300: '#f8b4cb', 400: '#f48fb1', 500: '#e0598d', 600: '#c94677' },
        cream: { 50: '#fffdf7', 100: '#fff8e1', 200: '#ffefb8' },
        mint: { 100: '#e3f4f2', 300: '#a8dcd6', 500: '#3a978d' },
        peach: { 100: '#fff6d6', 300: '#ffd54f' },
      },
      fontFamily: {
        sans: ['Almarai', 'system-ui', 'sans-serif'],
        display: ['Almarai', 'system-ui', 'sans-serif'],
        script: ['Almarai', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 14px 36px -18px rgba(148, 121, 204, 0.35)',
        glow: '0 10px 22px -10px rgba(224, 89, 141, 0.7)',
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
