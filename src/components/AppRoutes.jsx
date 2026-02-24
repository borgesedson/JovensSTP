import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

import { ProtectedRoute } from './ProtectedRoute'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { EmailVerificationBanner } from './EmailVerificationBanner'
import NotificationPermissionPrompt from './NotificationPermissionPrompt'

import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import { HomePage } from '../pages/HomePage'
import LandingPage from '../pages/LandingPage'
import { JobsPage } from '../pages/JobsPage'
import { CommunitiesPage } from '../pages/CommunitiesPage'
import { CommunityDetailPage } from '../pages/CommunityDetailPage'
import { ChatPage } from '../pages/ChatPage'
import { ProfilePage } from '../pages/ProfilePage'
import { PublicProfilePage } from '../pages/PublicProfilePage'
import { TermsPage } from '../pages/TermsPage'
import { PrivacyPage } from '../pages/PrivacyPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import DiscoverPage from '../pages/DiscoverPage'
import TalentsPage from '../pages/TalentsPage'
import CoursesPage from '../pages/CoursesPage'

const AppRoutes = () => {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Global Header always on top when authenticated */}
            {user && <Header />}

            {/* Email Verification Banner */}
            {user && !user.emailVerified && <EmailVerificationBanner />}

            {/* Notification Permission Prompt */}
            {user && <NotificationPermissionPrompt />}

            {/* Main content area with padding to avoid overlap with header and bottom nav */}
            <main className="pb-20">
                <Routes>
                    {/* Public Routes */}
                    <Route
                        path="/"
                        element={user ? <Navigate to="/home" replace /> : <LandingPage />}
                    />
                    <Route
                        path="/login"
                        element={user ? <Navigate to="/home" replace /> : <LoginPage />}
                    />
                    <Route
                        path="/signup"
                        element={user ? <Navigate to="/home" replace /> : <SignupPage />}
                    />
                    <Route
                        path="/reset-password"
                        element={<ResetPasswordPage />}
                    />

                    {/* Protected Routes */}
                    <Route
                        path="/home"
                        element={<ProtectedRoute element={<HomePage />} />}
                    />
                    <Route
                        path="/jobs"
                        element={<ProtectedRoute element={<JobsPage />} />}
                    />
                    <Route
                        path="/communities"
                        element={<ProtectedRoute element={<CommunitiesPage />} />}
                    />
                    <Route
                        path="/communities/:id"
                        element={<ProtectedRoute element={<CommunityDetailPage />} />}
                    />
                    <Route
                        path="/chat"
                        element={<ProtectedRoute element={<ChatPage />} />}
                    />
                    <Route
                        path="/profile"
                        element={<ProtectedRoute element={<ProfilePage />} />}
                    />
                    <Route
                        path="/profile/:userId"
                        element={<ProtectedRoute element={<PublicProfilePage />} />}
                    />
                    <Route
                        path="/discover"
                        element={<ProtectedRoute element={<DiscoverPage />} />}
                    />
                    <Route
                        path="/talents"
                        element={<ProtectedRoute element={<TalentsPage />} />}
                    />
                    <Route
                        path="/courses"
                        element={<ProtectedRoute element={<CoursesPage />} />}
                    />

                    {/* Legal Pages - Public */}
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            {/* Bottom navigation fixed at bottom when authenticated */}
            {user && <BottomNav />}
        </>
    )
}

export default AppRoutes