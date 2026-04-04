import TestApiPage from './pages/TestApiPage'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineIndicator } from './components/OfflineIndicator'
import { InstallPWA } from './components/InstallPWA'
import './App.css'

function App() {
  return (
    <div>
      <OfflineIndicator />
      <TestApiPage />
      <PWAUpdatePrompt />
      <InstallPWA />
    </div>
  )
}

export default App

