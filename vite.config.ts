/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // One app chunk on purpose: the service worker caches what was loaded, so everything the app needs
    // offline (screens, games, beer data) is in it – ~160 kB gzip. supabase-js and legal stay lazy.
    chunkSizeWarningLimit: 650,
  },
  css: {
    // Keyframes live once in index.css; modules must reference them by their global name.
    transformer: 'lightningcss',
    lightningcss: { cssModules: { animation: false, pattern: '[local]_[hash]' } },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
