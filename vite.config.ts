/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'

/** Build id shown in feedback („a74e951“): CI's commit, else the local checkout, else „dev“. */
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __APP_BUILD__: JSON.stringify(buildId()) },
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
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts'],
  },
})
