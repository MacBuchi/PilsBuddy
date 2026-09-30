import { AppProvider, useApp } from './state/AppContext'
import { AppShell } from './ui/AppShell'
import { Toast } from './ui/components/Toast'
import { Howto } from './ui/screens/Howto'
import { Welcome } from './ui/screens/Welcome'

function Screens() {
  const { state, globalToast } = useApp()
  return (
    <AppShell>
      {state.screen === 'welcome' && <Welcome />}
      {state.screen === 'howto' && <Howto />}
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
