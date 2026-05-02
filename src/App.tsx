import AppRouter from './routes/AppRouter'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineIndicator } from './components/OfflineIndicator'
import { InstallPWA } from './components/InstallPWA'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/mobile.css'
import { usePageViewTracking } from './hooks/usePageViewTracking'

function AppContent() {
  // Trackear page views automáticamente cuando cambia de ruta
  usePageViewTracking();

  return (
    <>
      <OfflineIndicator />
      <AppRouter />
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
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App
