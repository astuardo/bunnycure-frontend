import AppRouter from './routes/AppRouter'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineIndicator } from './components/OfflineIndicator'
import { InstallPWA } from './components/InstallPWA'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import './styles/mobile.css'

function App() {
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
  )
}

export default App
