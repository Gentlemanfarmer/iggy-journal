import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import { RefreshProvider } from './context/RefreshContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <ToastProvider>
        <RefreshProvider>
          <App />
        </RefreshProvider>
      </ToastProvider>
    </Router>
  </StrictMode>,
)
