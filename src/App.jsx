import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { StreamProvider } from './contexts/StreamContext'
import { LanguageProvider } from './contexts/LanguageContext'
import AppRoutes from './components/AppRoutes'
import IncomingCallToast from './components/IncomingCallToast'
import ChallengePopup from './components/ChallengePopup'
import ErrorBoundary from './components/ErrorBoundary'
import PWAInstallBanner from './components/PWAInstallBanner'
import { VideoProvider, StreamVideoWrapper } from './contexts/VideoContext'

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <LanguageProvider>
            <StreamProvider>
              <VideoProvider>
                <AppRoutes />
                {/* Incoming call toast (requires StreamVideo context) */}
                <StreamVideoWrapper>
                  <IncomingCallToast />
                </StreamVideoWrapper>
                <ChallengePopup />
                <PWAInstallBanner />
                <Toaster position="top-right" />
              </VideoProvider>
            </StreamProvider>
          </LanguageProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  )
}

export default App
