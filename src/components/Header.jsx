import { Search, Bell, Video, BookOpen } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useVideo } from '../contexts/VideoContext'
import { db } from '../services/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { SearchModal } from './SearchModal'
import { NotificationsModal } from './NotificationsModal'
import { toast } from 'react-hot-toast'

export const Header = () => {
  const { user } = useAuth()
  const { createMeeting } = useVideo()
  const navigate = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false)

  const handleCreateMeeting = async () => {
    if (isCreatingMeeting) return
    setIsCreatingMeeting(true)
    const toastId = toast.loading('Criando sala de reunião...')
    try {
      const callId = await createMeeting(`Reunião de ${user.displayName || 'Utilizador'}`)
      if (callId) {
        toast.success('Sala criada!', { id: toastId })
        navigate(`/meet/${callId}`)
      }
    } catch (error) {
      console.error('Erro ao criar reunião do header:', error)
      toast.error('Gola ao criar reunião.', { id: toastId })
    } finally {
      setIsCreatingMeeting(false)
    }
  }

  // Contar notificações não lidas + pedidos de conexão pendentes
  useEffect(() => {
    if (!user?.uid) return

    const notificationsRef = collection(db, 'notifications', user.uid, 'items')
    const q = query(notificationsRef, where('read', '==', false))

    const requestsRef = collection(db, 'connectionRequests')
    const qRequests = query(
      requestsRef,
      where('to', '==', user.uid),
      where('status', '==', 'pending')
    )

    let notifCount = 0
    let requestCount = 0

    const unsubNotif = onSnapshot(q, (snapshot) => {
      notifCount = snapshot.size
      setUnreadCount(notifCount + requestCount)
    })

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      requestCount = snapshot.size
      setUnreadCount(notifCount + requestCount)
    })

    return () => {
      unsubNotif()
      unsubRequests()
    }
  }, [user?.uid])

  return (
    <>
      <header className="bg-white fixed top-0 left-0 right-0 z-50 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          {/* Logo */}
          <Link to="/" className="text-xl sm:text-2xl font-bold">
            <span className="text-green-600">Jovens</span>
            <span className="text-yellow-500">STP</span>
          </Link>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {user && (
              <>
                <Link
                  to="/blog"
                  className="p-2 hover:bg-green-50 rounded-full transition text-green-600 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                  title="Blog JovensSTP"
                >
                  <BookOpen size={22} />
                </Link>
                <button 
                onClick={handleCreateMeeting}
                disabled={isCreatingMeeting}
                className="p-2 hover:bg-green-50 rounded-full transition text-green-600 disabled:opacity-50"
                title="Nova Reunião (Meet)"
              >
                <Video size={22} />
                </button>
              </>
            )}
            <button 
              onClick={() => setShowSearch(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <Search size={22} className="text-gray-600" />
            </button>
            <button 
              onClick={() => setShowNotifications(true)}
              className="p-2 hover:bg-gray-100 rounded-full relative transition"
            >
              <Bell size={22} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  )
}
