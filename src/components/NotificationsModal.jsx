import { useState, useEffect } from 'react'
import { X, Bell, Heart, MessageCircle, Briefcase, UserPlus, UserCheck, Clock } from 'lucide-react'
import { db } from '../services/firebase'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where, arrayUnion, addDoc } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { sendPushNotification } from '../services/notifications'

export const NotificationsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [connectionRequests, setConnectionRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingRequest, setProcessingRequest] = useState(null)

  useEffect(() => {
    if (!isOpen || !user?.uid) return

    const notificationsRef = collection(db, 'notifications', user.uid, 'items')
    const q = query(notificationsRef, orderBy('timestamp', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setNotifications(notifs)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [isOpen, user?.uid])

  // Listener para pedidos de conexão recebidos
  useEffect(() => {
    if (!isOpen || !user?.uid) return

    const requestsRef = collection(db, 'connectionRequests')
    const q = query(
      requestsRef,
      where('to', '==', user.uid),
      where('status', '==', 'pending'),
      orderBy('timestamp', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setConnectionRequests(requests)
    })

    return () => unsubscribe()
  }, [isOpen, user?.uid])

  const handleNotificationClick = async (notification) => {
    // Marcar como lida
    if (!notification.read) {
      const notifRef = doc(db, 'notifications', user.uid, 'items', notification.id)
      await updateDoc(notifRef, { read: true })
    }

    // Navegar para o destino
    if (notification.link) {
      navigate(notification.link)
      onClose()
    }
  }

  const handleAcceptRequest = async (request) => {
    setProcessingRequest(request.id)
    try {
      // Atualizar followers/following de ambos os usuários (conexão bilateral)
      const fromUserRef = doc(db, 'users', request.from)
      const toUserRef = doc(db, 'users', user.uid)

      // Quem enviou: adiciona o destinatário em following E followers
      await updateDoc(fromUserRef, { 
        following: arrayUnion(user.uid),
        followers: arrayUnion(user.uid)
      })
      
      // Quem recebeu: adiciona o remetente em followers E following
      await updateDoc(toUserRef, { 
        followers: arrayUnion(request.from),
        following: arrayUnion(request.from)
      })

      // Marcar pedido como aceito
      await updateDoc(doc(db, 'connectionRequests', request.id), {
        status: 'accepted'
      })

      // Criar notificação para quem enviou o pedido (não bloquear em caso de erro)
      try {
        const notifRef = collection(db, 'notifications', request.from, 'items')
        await addDoc(notifRef, {
          type: 'connection_accepted',
          message: `${user.displayName} aceitou o teu pedido de conexão`,
          timestamp: new Date(),
          read: false,
          link: `/profile/${user.uid}`
        })
        // Enviar push notification
        sendPushNotification(
          request.from,
          'Conexão aceite!',
          `${user.displayName} aceitou o teu pedido de conexão`
        )
      } catch (e) {
        console.debug('notification create error (accept via modal)', e)
      }

      toast.success('Conexão aceite!')
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error)
      toast.error('Erro ao aceitar pedido')
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (request) => {
    setProcessingRequest(request.id)
    try {
      await updateDoc(doc(db, 'connectionRequests', request.id), {
        status: 'rejected'
      })
      toast.success('Pedido rejeitado')
    } catch (error) {
      console.error('Erro ao rejeitar:', error)
      toast.error('Erro ao rejeitar pedido')
    } finally {
      setProcessingRequest(null)
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="text-red-500" size={20} fill="currentColor" />
      case 'comment':
        return <MessageCircle className="text-blue-500" size={20} />
      case 'job':
        return <Briefcase className="text-green-600" size={20} />
      case 'follow':
        return <UserPlus className="text-purple-500" size={20} />
      default:
        return <Bell className="text-gray-500" size={20} />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="text-green-600" size={22} />
            <h2 className="text-lg font-bold text-gray-900">Notificações</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={async () => {
                  try {
                    const unreadNotifs = notifications.filter(n => !n.read)
                    await Promise.all(
                      unreadNotifs.map(n =>
                        updateDoc(doc(db, 'notifications', user.uid, 'items', n.id), { read: true })
                      )
                    )
                    toast.success('Tudo marcado como lido')
                  } catch (e) {
                    console.error('mark all read error', e)
                    toast.error('Erro ao marcar como lido')
                  }
                }}
                className="text-xs text-green-600 hover:text-green-700 font-medium px-2 py-1 hover:bg-green-50 rounded transition"
              >
                Marcar tudo como lido
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Carregando...
            </div>
          ) : (
            <div>
              {/* Seção de Pedidos de Conexão Pendentes */}
              {connectionRequests.length > 0 && (
                <div className="border-b bg-green-50/30">
                  <div className="px-4 py-3 border-b bg-green-100/50">
                    <div className="flex items-center gap-2">
                      <UserPlus size={18} className="text-green-600" />
                      <h3 className="font-semibold text-sm text-green-900">
                        Pedidos de Conexão ({connectionRequests.length})
                      </h3>
                    </div>
                  </div>
                  {connectionRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 border-b hover:bg-white/50 transition"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {request.fromPhoto ? (
                            <img
                              src={request.fromPhoto}
                              alt={request.fromName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-green-400 to-green-600">
                              {request.fromName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>

                        {/* Info e Ações */}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            <button
                              onClick={() => {
                                navigate(`/profile/${request.from}`)
                                onClose()
                              }}
                              className="hover:text-green-600 transition"
                            >
                              {request.fromName}
                            </button>
                            {' '}quer conectar contigo
                          </p>
                          {request.timestamp && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatDistanceToNow(request.timestamp.toDate(), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </p>
                          )}

                          {/* Botões de Ação */}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleAcceptRequest(request)}
                              disabled={processingRequest === request.id}
                              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              {processingRequest === request.id ? (
                                <Clock className="animate-spin" size={16} />
                              ) : (
                                <>
                                  <UserCheck size={16} />
                                  Aceitar
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request)}
                              disabled={processingRequest === request.id}
                              className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm disabled:opacity-50"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Seção de Notificações Normais */}
              {notifications.length === 0 && connectionRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Bell size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sem notificações</p>
                  <p className="text-sm mt-1">Quando acontecer algo, vais ver aqui</p>
                </div>
              ) : notifications.length > 0 ? (
                <div>
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition border-b ${
                        !notif.read ? 'bg-green-50/50' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-left">
                        <p className={`text-sm ${!notif.read ? 'font-semibold' : ''}`}>
                          {notif.message}
                        </p>
                        {notif.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(notif.timestamp.toDate(), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        )}
                      </div>

                      {/* Unread indicator */}
                      {!notif.read && (
                        <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
