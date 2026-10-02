/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'

/** Build id shown in feedback („a74e951“): CI's commit, else the local checkout, else „dev“. */
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

/** Release name: CI passes the tag it will create (`v2026.10.02.123`), local builds are `dev-<commit>`. */
const version = process.env.APP_VERSION || `dev-${buildId()}`

/** dist/version.json – the post-deploy smoke test waits until production serves this commit. */
function versionFile(): Plugin {
  return {
    name: 'pilsbuddy-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version, sha: process.env.GITHUB_SHA || buildId(), builtAt: new Date().toISOString() }) + '\n',
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __APP_BUILD__: JSON.stringify(buildId()), __APP_VERSION__: JSON.stringify(version) },
  build: {
    // One app chunk on purpose: the service worker caches what was loaded, so everything the app needs
    // offline (screens, games, beer data, both languages) is in it – ~210 kB gzip. supabase-js and legal stay lazy.
    // The real limit is the gzip budget CI checks (job „Lint · Test · Build“); this only quiets Vite's raw-size hint.
    chunkSizeWarningLimit: 720,
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
