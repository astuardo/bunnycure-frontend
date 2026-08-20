import AppRouter from './routes/AppRouter'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineIndicator } from './components/OfflineIndicator'
import { InstallPWA } from './components/InstallPWA'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/mobile.css'
import BuildVersionGuard from './components/BuildVersionGuard'
import { TenantProvider } from './context/TenantContext'

function App() {
  return (
    <TenantProvider>
      <BuildVersionGuard>
        <OfflineIndicator />
        <AppRouter />
      </BuildVersionGuard>
      <PWAUpdatePrompt />
      <InstallPWA />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </TenantProvider>
  )
}

export default App
