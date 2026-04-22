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
import MeetingPage from '../pages/MeetingPage'
import { useLocation } from 'react-router-dom'
import { BlogPage } from '../pages/BlogPage'
import { BlogEditor } from '../pages/BlogEditor'
import { BlogPostDetail } from '../pages/BlogPostDetail'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const VersionSentinel = () => {
    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Fetch version.json without cache
                const response = await fetch('/version.json?t=' + Date.now());
                if (!response.ok) return;
                
                const data = await response.json();
                const currentVersion = localStorage.getItem('app_version');
                
                if (currentVersion && currentVersion !== data.version) {
                    localStorage.setItem('app_version', data.version);
                    toast.loading('A atualizar plataforma...', { duration: 2000 });
                    setTimeout(() => window.location.reload(), 1500);
                } else if (!currentVersion) {
                    localStorage.setItem('app_version', data.version);
                }
            } catch (e) {
                // Silently fail if network is down or file not found
            }
        };

        // Check every 5 minutes
        const interval = setInterval(checkVersion, 5 * 60 * 1000);
        // Initial check on load
        setTimeout(checkVersion, 2000);
        
        return () => clearInterval(interval);
    }, []);
    return null;
}

const AppRoutes = () => {
    const { user, loading } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    const params = new URLSearchParams(location.search);
    const fromSeoId = params.get('from_seo');

    useEffect(() => {
        console.log('🔍 AppRoutes: Search params:', location.search);
        if (fromSeoId) {
            console.log('🚀 AppRoutes: SEO REDIRECT DETECTADO! Indo para o post:', fromSeoId);
            navigate(`/blog/${fromSeoId}`, { replace: true });
        }
    }, [fromSeoId, navigate]);
    
    // Exclude Header/BottomNav from full-screen experiences like Meet and Editor
    const isMeetingPage = location.pathname.startsWith('/meet/')
    const isEditingBlog = location.pathname === '/blog/create'

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
            <VersionSentinel />
            {/* Global Header always on top when authenticated (except on meeting page or editor) */}
            {user && !isMeetingPage && !isEditingBlog && <Header />}
 
            {/* Email Verification Banner */}
            {user && !user.emailVerified && !isMeetingPage && <EmailVerificationBanner />}

            {/* Notification Permission Prompt */}
            {user && <NotificationPermissionPrompt />}

            {/* Main content area */}
            <main className={isMeetingPage ? "" : "pb-20"}>
                <Routes>
                    {/* Public Routes */}
                    <Route
                        path="/"
                        element={
                            fromSeoId ? (
                                <Navigate to={`/blog/${fromSeoId}`} replace />
                            ) : user ? (
                                <Navigate 
                                    to={location.state?.from || "/home"} 
                                    replace 
                                    state={{ from: location.pathname, search: location.search }} 
                                />
                            ) : (
                                <LandingPage />
                            )
                        }
                    />
                    <Route
                        path="/login"
                        element={user ? <Navigate to={location.state?.from || "/home"} replace /> : <LoginPage />}
                    />
                    <Route
                        path="/signup"
                        element={user ? <Navigate to={location.state?.from || "/home"} replace /> : <SignupPage />}
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
                    
                    {/* Blog Routes */}
                    <Route
                        path="/blog"
                        element={<BlogPage />}
                    />
                    <Route
                        path="/blog/create"
                        element={<ProtectedRoute element={<BlogEditor />} />}
                    />
                    <Route
                        path="/blog/:id"
                        element={<BlogPostDetail />}
                    />
                    
                    <Route
                        path="/talents"
                        element={<ProtectedRoute element={<TalentsPage />} />}
                    />
                    <Route
                        path="/courses"
                        element={<ProtectedRoute element={<CoursesPage />} />}
                    />
                    <Route
                        path="/meet/:callId"
                        element={<ProtectedRoute element={<MeetingPage />} />}
                    />

                    {/* Legal Pages - Public */}
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            {/* Bottom navigation fixed at bottom when authenticated (except on meeting page) */}
            {user && !isMeetingPage && <BottomNav />}
        </>
    )
}

export default AppRoutes