import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import './index.css'
import App from './App.tsx'

const BottleGallery = import.meta.env.DEV ? lazy(() => import('./ui/dev/BottleGallery')) : null
const gallery = BottleGallery && new URLSearchParams(location.search).get('gallery') === 'bottles'

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
