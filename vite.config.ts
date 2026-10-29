import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the same build run on GitHub Pages, Netlify, Vercel or any static host.
export default defineConfig({
  plugins: [react()],
  base: './',
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
});
