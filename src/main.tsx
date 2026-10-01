import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
// bottle labels (generated SVG, see domain/bottles)
import '@fontsource/young-serif/400.css'
import '@fontsource/unifrakturcook/700.css'
import './index.css'
import App from './App.tsx'
import { refreshCatalog } from './data/catalog'

const BottleGallery = import.meta.env.DEV ? lazy(() => import('./ui/dev/BottleGallery')) : null
const gallery = BottleGallery && new URLSearchParams(location.search).get('gallery') === 'bottles'

// Offline support: production only, so dev never serves stale modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* no SW (private mode, old browser) – the app works online as before */
    })
  })
}

// Beer catalogue (B3): fetch new rows in the background; they apply on the next start.
window.addEventListener('load', () => setTimeout(() => void refreshCatalog(), 2000))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {gallery && BottleGallery ? (
      <Suspense>
        <BottleGallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
