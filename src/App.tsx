import { AppProvider, useApp } from './state/AppContext'
import { lazy, Suspense, useCallback } from 'react'
import { useDerived } from './state/useDerived'
import { AppShell } from './ui/AppShell'
import { MomentOverlay } from './ui/components/MomentOverlay'
import { TabBar } from './ui/components/TabBar'
import { Toast } from './ui/components/Toast'
import { Analyzing } from './ui/screens/Analyzing'
import { AvatarScreen } from './ui/screens/AvatarScreen'
import { Detail } from './ui/screens/Detail'
import { Dna } from './ui/screens/Dna'
import { Games } from './ui/screens/Games'
import { ErrorBoundary } from './ui/screens/ErrorScreen'
import { Howto } from './ui/screens/Howto'
import { Library } from './ui/screens/Library'
import { Match } from './ui/screens/Match'
import { Matches } from './ui/screens/Matches'
import { Profile } from './ui/screens/Profile'
import { Quartett } from './ui/screens/Quartett'
import { Regional } from './ui/screens/Regional'
import { Swipe } from './ui/screens/Swipe'
import { Welcome } from './ui/screens/Welcome'

/** Impressum & Datenschutz: rarely opened, so it stays out of the main bundle. */
const Legal = lazy(() => import('./ui/screens/Legal').catch(() => import('./ui/screens/LegalOffline')))
/** Brewery world map: the world outline is ~200 KB, so it loads only when opened. */
const BreweryMap = lazy(() => import('./ui/screens/BreweryMap').catch(() => import('./ui/screens/MapOffline')))

/** Shows the one-time moment for the first big achievement that hasn't been celebrated yet. */
function MomentHost() {
  const { state, dispatch, go } = useApp()
  const { achievements, avatar } = useDerived()
  const pending = achievements.find((a) => a.unlocked && a.moment && !state.profile.seen.includes(a.id))
  const id = pending?.id
  const close = useCallback(() => {
    if (id) dispatch({ type: 'MARK_SEEN', id })
  }, [dispatch, id])
  if (!pending || ['welcome', 'howto', 'analyzing', 'quartett'].includes(state.screen)) return null
  const onDna =
    pending.id === 'entschluesselt'
      ? () => {
          close()
          go(state.profile.onboarded ? 'dna' : 'analyzing')
        }
      : undefined
  return <MomentOverlay achievement={pending} avatar={avatar} onClose={close} onDna={onDna} />
}

function Screens() {
  const { state, globalToast, withTabs } = useApp()
  const s = state.screen
  return (
    <AppShell>
      <ErrorBoundary>
        {s === 'welcome' && <Welcome />}
        {s === 'howto' && <Howto />}
        {s === 'swipe' && <Swipe />}
        {s === 'analyzing' && <Analyzing />}
        {s === 'dna' && <Dna />}
        {s === 'avatar' && <AvatarScreen />}
        {s === 'match' && <Match />}
        {s === 'detail' && <Detail />}
        {s === 'matches' && <Matches />}
        {s === 'profile' && <Profile />}
        {s === 'games' && <Games />}
        {s === 'quartett' && <Quartett />}
        {s === 'regional' && <Regional />}
        {s === 'library' && <Library />}
        {s === 'map' && (
          <Suspense fallback={null}>
            <BreweryMap />
          </Suspense>
        )}
        {s === 'legal' && (
          <Suspense fallback={null}>
            <Legal />
          </Suspense>
        )}
      </ErrorBoundary>
      {withTabs && <TabBar />}
      <MomentHost />
      {globalToast && <Toast text={globalToast.text} color={globalToast.color} animKey={globalToast.key} />}
    </AppShell>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Screens />
    </AppProvider>
  )
}
