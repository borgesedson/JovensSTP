import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Briefcase, Users, MessageCircle, User, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { db } from '../services/firebase'
import { collection, onSnapshot, query, where } from 'firebase/firestore'

export const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

  const isActive = (path) => location.pathname === path

  // (Conditional return moved below hooks to avoid violation)

  // Navigation items baseado no tipo de usuário (5 itens no total)
  // Jovens: Início | Descobrir (com vagas) | Comunidades | Mensagens | Perfil
  // Empresas: Início | Talentos (com vagas) | Comunidades | Mensagens | Perfil
  const discoverItem = user?.type === 'young'
    ? { label: 'Descobrir', icon: Sparkles, path: '/discover' }
    : { label: 'Talentos', icon: Users, path: '/talents' }

  const navItems = [
    { label: 'Início', icon: Home, path: '/' },
    discoverItem,
    { label: 'Comunidades', icon: Users, path: '/communities' },
    { label: 'Mensagens', icon: MessageCircle, path: '/chat' },
    { label: 'Perfil', icon: User, path: '/profile' },
  ]

  // Observa notificações de mensagens não lidas para exibir o ponto vermelho
  useEffect(() => {
    if (!user?.uid) {
      setHasUnreadMessages(false)
      return
    }

    const notifRef = collection(db, 'notifications', user.uid, 'items')
    const q = query(
      notifRef,
      where('read', '==', false),
      where('type', '==', 'message')
    )

    const unsub = onSnapshot(q, (snap) => {
      setHasUnreadMessages(snap.size > 0)
    })

    return () => unsub()
  }, [user?.uid])



  // HIDE BottomNav when a chat channel is open on mobile
  if (location.pathname === '/chat' && location.state?.chatOpen) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center max-w-7xl mx-auto h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 flex-1 relative transition-colors ${active ? 'text-green-600' : 'text-gray-500'
                }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-medium mt-1">{item.label}</span>
              {item.path === '/chat' && hasUnreadMessages && (
                <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
