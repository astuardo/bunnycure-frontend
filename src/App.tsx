import AppRouter from './routes/AppRouter'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineIndicator } from './components/OfflineIndicator'
import { InstallPWA } from './components/InstallPWA'
import { WebPushPrompt } from './components/pwa/WebPushPrompt'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import BuildVersionGuard from './components/BuildVersionGuard'
import { TenantProvider } from './context/TenantContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ConfirmDialogHost } from './components/ui/ConfirmDialogHost'

function App() {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <BuildVersionGuard>
          <OfflineIndicator />
          <AppRouter />
        </BuildVersionGuard>
        <PWAUpdatePrompt />
        <InstallPWA />
        <WebPushPrompt />
        <ConfirmDialogHost />
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
    </ErrorBoundary>
  )
}

export default App
