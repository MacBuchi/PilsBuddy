import { AppProvider, useApp } from './state/AppContext'
import { AppShell } from './ui/AppShell'
import { TAB_SCREENS } from './state/reducer'
import { TabBar } from './ui/components/TabBar'
import { Toast } from './ui/components/Toast'
import { Howto } from './ui/screens/Howto'
import { Swipe } from './ui/screens/Swipe'
import { Welcome } from './ui/screens/Welcome'

function Screens() {
  const { state, globalToast } = useApp()
  const withTabs = state.profile.onboarded && (TAB_SCREENS as readonly string[]).includes(state.screen)
  return (
    <AppShell>
      {state.screen === 'welcome' && <Welcome />}
      {state.screen === 'howto' && <Howto />}
      {state.screen === 'swipe' && <Swipe withTabs={withTabs} />}
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
