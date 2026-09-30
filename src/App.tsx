import { AppProvider, useApp } from './state/AppContext'
import { AppShell } from './ui/AppShell'
import { TabBar } from './ui/components/TabBar'
import { Toast } from './ui/components/Toast'
import { Analyzing } from './ui/screens/Analyzing'
import { AvatarScreen } from './ui/screens/AvatarScreen'
import { Detail } from './ui/screens/Detail'
import { Dna } from './ui/screens/Dna'
import { ErrorBoundary } from './ui/screens/ErrorScreen'
import { Howto } from './ui/screens/Howto'
import { Match } from './ui/screens/Match'
import { Matches } from './ui/screens/Matches'
import { Profile } from './ui/screens/Profile'
import { Swipe } from './ui/screens/Swipe'
import { Welcome } from './ui/screens/Welcome'

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
      </ErrorBoundary>
      {withTabs && <TabBar />}
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
