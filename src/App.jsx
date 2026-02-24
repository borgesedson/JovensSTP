import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { StreamProvider } from './contexts/StreamContext'
import { VideoProvider, StreamVideoWrapper } from './contexts/VideoContext'
import AppRoutes from './components/AppRoutes'
import IncomingCallToast from './components/IncomingCallToast'
import AIAssistantOverlay from './components/AIAssistantOverlay'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <StreamProvider>
            <VideoProvider>
              <AppRoutes />
              <AIAssistantOverlay />
              {/* Incoming call toast (requires StreamVideo context) */}
              <StreamVideoWrapper>
                <IncomingCallToast />
              </StreamVideoWrapper>
              <Toaster position="top-right" />
            </VideoProvider>
          </StreamProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  )
}

export default App
