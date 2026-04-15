import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const APP_VERSION = Date.now().toString();

// https://vite.dev/config/
export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(APP_VERSION),
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-router'],
  },
  plugins: [
    react(),
  ],
})
