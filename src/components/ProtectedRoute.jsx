import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export const ProtectedRoute = ({ element, requiredUserType = null }) => {
  const { user, userType, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredUserType && userType !== requiredUserType) {
    return <Navigate to="/" replace />
  }

  return element
}
