import Modal from '../components/Modal'
import { useEffect, useState } from 'react'

import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStreamChat } from '../hooks/useStreamChat'
import { db } from '../services/firebase'
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { ChevronLeft, Loader, MapPin, Briefcase, GraduationCap, MessageCircle, Calendar, UserPlus, UserCheck, Clock, X, Linkedin, Github, Instagram, Globe } from 'lucide-react'
import { aggregateFollowerNotification, sendPushNotification } from '../services/notifications'
import { PostCard } from '../components/PostCard'
import { VerifiedBadge } from '../components/VerifiedBadge'
import CallButtons from '../components/CallButtons'
import { formatEducation } from '../utils/formatters'
import toast from 'react-hot-toast'

export const PublicProfilePage = () => {
  const [showAvatarModal, setShowAvatarModal] = useState(false)

  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const { chatClient, createChannel } = useStreamChat()
  const navigate = useNavigate()
  const [profileUser, setProfileUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [connectionRequest, setConnectionRequest] = useState(null) // pending, sent, accepted

  const isOwnProfile = currentUser?.uid === userId

  // Helper para suportar 'type' ou 'userType'
  const getUserType = (user) => user?.userType || user?.type
  const currentUserType = getUserType(currentUser)
  const profileUserType = getUserType(profileUser)

  const ensureProtocol = (url) => {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    return `https://${url}`
  }

  // Verificar se já está seguindo ou se há pedido pendente
  useEffect(() => {
    if (!currentUser || !profileUser) return
    
    const following = profileUser.followers?.includes(currentUser.uid) || false
    setIsFollowing(following)

    // Verificar se existe pedido de conexão pendente
    const checkConnectionRequest = async () => {
      try {
        // Verificar pedido enviado por mim
        const sentQuery = query(
          collection(db, 'connectionRequests'),
          where('from', '==', currentUser.uid),
          where('to', '==', userId),
          where('status', '==', 'pending')
        )
        const sentSnapshot = await getDocs(sentQuery)
        
        if (!sentSnapshot.empty) {
          setConnectionRequest({ id: sentSnapshot.docs[0].id, type: 'sent' })
          return
        }

        // Verificar pedido recebido
        const receivedQuery = query(
          collection(db, 'connectionRequests'),
          where('from', '==', userId),
          where('to', '==', currentUser.uid),
          where('status', '==', 'pending')
        )
        const receivedSnapshot = await getDocs(receivedQuery)
        
        if (!receivedSnapshot.empty) {
          setConnectionRequest({ id: receivedSnapshot.docs[0].id, type: 'received' })
        } else {
          setConnectionRequest(null)
        }
      } catch (error) {
        console.error('Erro ao verificar pedido:', error)
      }
    }

    // Suporta tanto 'type' quanto 'userType'
    const profileType = profileUser.userType || profileUser.type
    if (!following && profileType !== 'company') {
      checkConnectionRequest()
    }
  }, [currentUser, profileUser, userId])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        console.error('userId não definido')
        navigate('/')
        return
      }

      console.log('🔍 Buscando perfil do userId:', userId)
      
      try {
        const userDoc = await getDoc(doc(db, 'users', userId))
        console.log('📄 Documento existe?', userDoc.exists())
        
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() }
          console.log('✅ Dados do perfil:', userData)
          setProfileUser(userData)
        } else {
          console.warn('⚠️ Perfil não encontrado no Firestore')
          toast.error('Perfil não encontrado')
          navigate('/')
        }
      } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error)
        toast.error('Erro ao carregar perfil')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId, navigate])

  useEffect(() => {
    const fetchPosts = async () => {
      if (!userId) return
      
      console.log('🔍 Buscando posts do userId:', userId)
      
      try {
        // Buscar sem orderBy para evitar problema de índice
        const postsRef = collection(db, 'stories')
        const q = query(postsRef, where('authorId', '==', userId))
        const snapshot = await getDocs(q)
        const postsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        
        // Ordenar manualmente por timestamp
        postsList.sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || 0
          const timeB = b.timestamp?.toMillis?.() || 0
          return timeB - timeA
        })
        
        console.log('✅ Posts encontrados:', postsList.length)
        setPosts(postsList)
      } catch (error) {
        console.error('❌ Erro ao carregar posts:', error)
        setPosts([])
      } finally {
        setLoadingPosts(false)
      }
    }

    if (userId) {
      fetchPosts()
    }
  }, [userId])

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error('Precisas fazer login para seguir')
      return
    }

    setFollowLoading(true)
    try {
      const isCompany = profileUserType === 'company'

      // Para empresas: seguir diretamente (sem pedido)
      if (isCompany) {
        const userRef = doc(db, 'users', userId)
        const currentUserRef = doc(db, 'users', currentUser.uid)

        if (isFollowing) {
          await updateDoc(userRef, { followers: arrayRemove(currentUser.uid) })
          await updateDoc(currentUserRef, { following: arrayRemove(userId) })
          setIsFollowing(false)
          toast.success('Deixaste de seguir')
        } else {
          await updateDoc(userRef, { followers: arrayUnion(currentUser.uid) })
          await updateDoc(currentUserRef, { following: arrayUnion(userId) })
          setIsFollowing(true)
          setProfileUser(prev => ({
            ...prev,
            followers: [...(prev.followers || []), currentUser.uid]
          }))
          toast.success('Seguindo empresa!')
          // Aggregate follower notification for the company (reduce noise)
          try {
            await aggregateFollowerNotification(userId, {
              uid: currentUser.uid,
              name: currentUser.displayName,
              photo: currentUser.photoURL,
            })
          } catch (e) {
            // Non-blocking
            console.debug('aggregateFollowerNotification error', e)
          }
        }
      } else {
        // Para jovens: sistema de pedidos de conexão
        if (isFollowing) {
          // Remover conexão existente
          const userRef = doc(db, 'users', userId)
          const currentUserRef = doc(db, 'users', currentUser.uid)
          await updateDoc(userRef, { followers: arrayRemove(currentUser.uid) })
          await updateDoc(currentUserRef, { following: arrayRemove(userId) })
          setIsFollowing(false)
          setProfileUser(prev => ({
            ...prev,
            followers: (prev.followers || []).filter(id => id !== currentUser.uid)
          }))
          toast.success('Conexão removida')
        } else if (connectionRequest?.type === 'sent') {
          // Cancelar pedido enviado
          await deleteDoc(doc(db, 'connectionRequests', connectionRequest.id))
          setConnectionRequest(null)
          toast.success('Pedido cancelado')
        } else if (connectionRequest?.type === 'received') {
          // Aceitar pedido recebido (conexão bilateral)
          const userRef = doc(db, 'users', userId)
          const currentUserRef = doc(db, 'users', currentUser.uid)
          
          // Ambos ficam em followers E following um do outro
          await updateDoc(userRef, { 
            followers: arrayUnion(currentUser.uid),
            following: arrayUnion(currentUser.uid)
          })
          await updateDoc(currentUserRef, { 
            following: arrayUnion(userId),
            followers: arrayUnion(userId)
          })
          await updateDoc(doc(db, 'connectionRequests', connectionRequest.id), {
            status: 'accepted'
          })
          
          setIsFollowing(true)
          setConnectionRequest(null)
          setProfileUser(prev => ({
            ...prev,
            followers: [...(prev.followers || []), currentUser.uid],
            following: [...(prev.following || []), currentUser.uid]
          }))
          
          // Criar notificação (não bloquear fluxo se falhar)
          try {
            const notifRef = collection(db, 'notifications', userId, 'items')
            await addDoc(notifRef, {
              type: 'connection_accepted',
              message: `${currentUser.displayName} aceitou o teu pedido de conexão`,
              read: false,
              timestamp: new Date(),
              link: `/profile/${currentUser.uid}`
            })
            // Enviar push notification
            sendPushNotification(
              userId,
              'Conexão aceite!',
              `${currentUser.displayName} aceitou o teu pedido de conexão`
            )
          } catch (e) {
            console.debug('notification create error (accepted)', e)
          }
          
          toast.success('Conexão aceite!')
        } else {
          // Enviar novo pedido
          const requestData = {
            from: currentUser.uid,
            fromName: currentUser.displayName,
            fromPhoto: currentUser.photoURL,
            to: userId,
            toName: profileUser.displayName,
            status: 'pending',
            timestamp: serverTimestamp()
          }
          
          const docRef = await addDoc(collection(db, 'connectionRequests'), requestData)
          setConnectionRequest({ id: docRef.id, type: 'sent' })
          
          // Criar notificação (não bloquear fluxo se falhar)
          try {
            const notifRef = collection(db, 'notifications', userId, 'items')
            await addDoc(notifRef, {
              type: 'connection_request',
              message: `${currentUser.displayName} quer conectar contigo`,
              read: false,
              timestamp: new Date(),
              link: `/profile/${currentUser.uid}`
            })
            // Enviar push notification
            sendPushNotification(
              userId,
              'Novo pedido de conexão',
              `${currentUser.displayName} quer conectar contigo`
            )
          } catch (e) {
            console.debug('notification create error (request)', e)
          }
          
          toast.success('Pedido enviado!')
        }
      }
    } catch (error) {
      console.error('Erro ao seguir/conectar:', error)
      toast.error('Erro ao atualizar')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleRejectRequest = async () => {
    if (!connectionRequest?.id) return
    
    setFollowLoading(true)
    try {
      await updateDoc(doc(db, 'connectionRequests', connectionRequest.id), {
        status: 'rejected'
      })
      
      setConnectionRequest(null)
      toast.success('Pedido rejeitado')
    } catch (error) {
      console.error('Erro ao rejeitar:', error)
      toast.error('Erro ao rejeitar pedido')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast.error('Precisas fazer login')
      return
    }

    if (!chatClient) {
      toast.error('Chat não disponível')
      return
    }

    try {
      // Gate messaging rules
      if (currentUserType === 'young' && profileUserType === 'young') {
        const connected = isFollowing // connection established via accepted request
        const open = !!profileUser.openToMessages
        if (!connected && !open) {
          toast.error('Esta pessoa só recebe mensagens de conexões. Envia um pedido de conexão primeiro.')
          return
        }
      }

      const loadingToast = toast.loading('Abrindo conversa...')
      
      // Usar função helper para criar canal
      const channelId = await createChannel(
        userId,
        profileUser.displayName || 'Conversa'
      )
      
      toast.dismiss(loadingToast)
      toast.success('Conversa aberta!')
      
      // Navegar para chat apenas com o channelId (não passar o objeto channel)
      navigate('/chat', { state: { channelId } })
    } catch (error) {
      console.error('Erro ao abrir chat:', error)
      toast.dismiss()
      
      // Mensagem de erro mais específica
      if (error.code === 'ECONNABORTED') {
        toast.error('Timeout ao criar conversa. Tenta novamente.')
      } else {
        toast.error('Erro ao abrir conversa. Verifica tua conexão.')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen pb-24">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-green-600" size={32} />
          <p className="text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-20">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft />
          </button>
          <h1 className="text-xl font-bold">Perfil</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Informações do Perfil */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {profileUser.photoURL ? (
                <img 
                  src={profileUser.photoURL} 
                  alt={profileUser.displayName} 
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setShowAvatarModal(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-gradient-to-br from-green-400 to-green-600">
                  {profileUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {/* Modal para exibir avatar em tela cheia */}
              {profileUser.photoURL && showAvatarModal && (
                <Modal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)}>
                  <div className="relative flex flex-col items-center justify-center h-full w-full p-4">
                    <button
                      onClick={() => setShowAvatarModal(false)}
                      className="absolute top-4 right-4 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition z-10"
                      aria-label="Fechar"
                    >
                      Fechar
                    </button>
                    <img
                      src={profileUser.photoURL}
                      alt={profileUser.displayName}
                      className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border-4 border-white"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                </Modal>
              )}
            </div>

            {/* Info básica */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{profileUserType === 'company' ? (profileUser.company || profileUser.displayName) : profileUser.displayName}</h2>
                {profileUser.emailVerified && <VerifiedBadge size={20} />}
                {profileUserType === 'young' && profileUser.openToMessages && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-semibold tracking-wide">Aberto a mensagens</span>
                )}
              </div>
              {profileUser.bio && (
                <p className="text-gray-600 mb-3">{profileUser.bio}</p>
              )}

              {/* Social links */}
              {(() => {
                const socials = profileUser.socials || {}
                const website = profileUser.website
                const items = []
                if (socials?.linkedin) items.push({ type: 'linkedin', url: ensureProtocol(socials.linkedin) })
                if (socials?.github) items.push({ type: 'github', url: ensureProtocol(socials.github) })
                if (socials?.instagram) items.push({ type: 'instagram', url: ensureProtocol(socials.instagram) })
                if (website) items.push({ type: 'website', url: ensureProtocol(website) })
                if (items.length === 0) return null
                return (
                  <div className="mb-3 flex items-center gap-2">
                    {items.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 hover:bg-green-100 text-green-700">
                        {s.type === 'linkedin' && <Linkedin size={18} />}
                        {s.type === 'github' && <Github size={18} />}
                        {s.type === 'instagram' && <Instagram size={18} />}
                        {s.type === 'website' && <Globe size={18} />}
                      </a>
                    ))}
                  </div>
                )
              })()}
              
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                {profileUser.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{profileUser.location}</span>
                  </div>
                )}
                {profileUserType && (
                  <div className="flex items-center gap-1">
                    <Briefcase size={16} />
                    <span className="capitalize">{profileUserType === 'young' ? 'Jovem Profissional' : 'Empresa'}</span>
                  </div>
                )}
              </div>

              {/* Contadores de seguidores/seguindo */}
              <div className="flex gap-4 mt-3 text-sm">
                <div>
                  <span className="font-bold text-gray-900">{profileUser.followers?.length || 0}</span>
                  <span className="text-gray-600 ml-1">
                    {profileUserType === 'company' ? 'Seguidores' : 'Conexões'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-gray-900">{profileUser.following?.length || 0}</span>
                  <span className="text-gray-600 ml-1">Seguindo</span>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            {(() => {
              console.log('DEBUG PublicProfilePage:', {
                currentUser,
                profileUser,
                isOwnProfile,
                currentUserType,
                profileUserType
              })
              return null
            })()}
            {!isOwnProfile && currentUser && (
              <>
                {/* Jovem visualizando jovem: pode conectar */}
                {currentUserType === 'young' && profileUserType === 'young' && (
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    {/* Botão de conectar com estados */}
                    {connectionRequest?.type === 'received' ? (
                      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                        >
                          {followLoading ? (
                            <Loader className="animate-spin" size={18} />
                          ) : (
                            <>
                              <UserCheck size={18} />
                              Aceitar
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleRejectRequest}
                          disabled={followLoading}
                          className="w-full px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                        >
                          <X size={18} />
                          Rejeitar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 font-medium ${
                          isFollowing
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : connectionRequest?.type === 'sent'
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        } disabled:opacity-50`}
                      >
                        {followLoading ? (
                          <Loader className="animate-spin" size={18} />
                        ) : isFollowing ? (
                          <>
                            <UserCheck size={18} />
                            Conectado
                          </>
                        ) : connectionRequest?.type === 'sent' ? (
                          <>
                            <Clock size={18} />
                            Pedido Enviado
                          </>
                        ) : (
                          <>
                            <UserPlus size={18} />
                            Conectar
                          </>
                        )}
                      </button>
                    )}
                    {/* Mensagem: permitido se conexões OU destinatário aberto a mensagens */}
                    {(() => {
                      const canMessage = isFollowing || !!profileUser.openToMessages
                      return (
                        <>
                          <button
                            onClick={handleSendMessage}
                            disabled={!canMessage}
                            title={canMessage ? '' : 'Só conexões ou perfis abertos a mensagens'}
                            className={`w-full sm:w-auto px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 font-medium ${
                              canMessage
                                ? 'bg-white border-2 border-green-600 text-green-600 hover:bg-green-50'
                                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <MessageCircle size={18} />
                            Mensagem
                          </button>
                          
                          {/* Botões de chamada (apenas se puder mandar mensagem) */}
                          {canMessage && (
                            <CallButtons
                              userId={userId}
                              userName={profileUser.displayName || profileUser.name}
                              userImage={profileUser.photoURL || profileUser.avatarUrl}
                              className="justify-center"
                            />
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
                {/* Empresa visualizando jovem: permitir mensagem direta */}
                {currentUserType === 'company' && profileUserType === 'young' && (
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleSendMessage}
                      className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition flex items-center justify-center gap-2 font-medium"
                    >
                      <MessageCircle size={18} />
                      Mensagem
                    </button>
                    
                    {/* Botões de chamada para empresas falando com jovens */}
                    <CallButtons
                      userId={userId}
                      userName={profileUser.displayName || profileUser.name}
                      userImage={profileUser.photoURL || profileUser.avatarUrl}
                      className="justify-center"
                    />
                  </div>
                )}
                {/* Empresa visualizando empresa OU jovem visualizando empresa: pode seguir */}
                {profileUserType === 'company' && (
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`w-full sm:w-auto px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 font-medium ${
                        isFollowing
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      } disabled:opacity-50`}
                    >
                      {followLoading ? (
                        <Loader className="animate-spin" size={18} />
                      ) : isFollowing ? (
                        <>
                          <UserCheck size={18} />
                          Seguindo
                        </>
                      ) : (
                        <>
                          <UserPlus size={18} />
                          Seguir
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition flex items-center justify-center gap-2 font-medium"
                    >
                      <MessageCircle size={18} />
                      Mensagem
                    </button>
                    
                    {/* Botões de chamada para empresas */}
                    <CallButtons
                      userId={userId}
                      userName={profileUser.displayName || profileUser.name}
                      userImage={profileUser.photoURL || profileUser.avatarUrl}
                      className="justify-center"
                    />
                  </div>
                )}
              </>
            )}
            {isOwnProfile && (
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Editar Perfil
              </button>
            )}
          </div>

          {/* Educação */}
          {profileUser.education && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="text-green-600" size={20} />
                <h3 className="font-bold text-lg">Educação</h3>
              </div>
              <div className="pl-8">
                {Array.isArray(profileUser.education) ? (
                  <div className="space-y-3">
                    {[...profileUser.education]
                      .sort((a, b) => {
                        const ay = parseInt(a?.endYear || a?.startYear || '0', 10)
                        const by = parseInt(b?.endYear || b?.startYear || '0', 10)
                        const aEndEmpty = !a?.endYear
                        const bEndEmpty = !b?.endYear
                        if (ay === by) return (aEndEmpty === bEndEmpty) ? 0 : (aEndEmpty ? -1 : 1)
                        return by - ay
                      })
                      .map((edu, index) => (
                      <div key={index}>
                        <h4 className="font-semibold">{edu.degree || edu.course}</h4>
                        <p className="text-gray-600 text-sm">{edu.institution || edu.school}</p>
                        {(edu.startYear || edu.endYear) && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Calendar size={12} />
                            <span>
                              {edu.startYear || '?'} - {edu.endYear || edu.current ? 'Presente' : '?'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-700">
                    {formatEducation(profileUser.education)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Experiência */}
          {Array.isArray(profileUser.experience) && profileUser.experience.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="text-green-600" size={20} />
                <h3 className="font-bold text-lg">Experiência</h3>
              </div>
              <div className="space-y-3">
                {[...profileUser.experience]
                  .sort((a, b) => {
                    const ay = parseInt(a?.endYear || a?.startYear || '0', 10)
                    const by = parseInt(b?.endYear || b?.startYear || '0', 10)
                    const aEndEmpty = !a?.endYear
                    const bEndEmpty = !b?.endYear
                    if (ay === by) return (aEndEmpty === bEndEmpty) ? 0 : (aEndEmpty ? -1 : 1)
                    return by - ay
                  })
                  .map((exp, index) => (
                  <div key={index} className="pl-8">
                    <h4 className="font-semibold">{exp.role || exp.position || exp.title || 'Cargo'}</h4>
                    <p className="text-gray-600 text-sm">{exp.company || 'Empresa'}</p>
                    {(exp.startYear || exp.endYear || exp.startDate || exp.endDate) && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar size={12} />
                        <span>
                          {(exp.startYear || exp.startDate || '?')} - {exp.current ? 'Presente' : (exp.endYear || exp.endDate || '?')}
                        </span>
                      </div>
                    )}
                    {exp.description && (
                      <p className="text-sm text-gray-600 mt-1">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {(() => {
            const skills = Array.isArray(profileUser.skills)
              ? profileUser.skills
              : (typeof profileUser.skills === 'string' && profileUser.skills.trim().length > 0
                  ? profileUser.skills.split(',').map(s => s.trim()).filter(Boolean)
                  : [])
            return skills.length > 0 ? (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-lg">Skills</h3>
                </div>
                <div className="pl-1 flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <span key={`${s}-${i}`} className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null
          })()}
        </div>

        {/* Posts do Usuário */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">
            Posts {!isOwnProfile && `de ${profileUser.displayName?.split(' ')[0]}`}
          </h3>
          
          {loadingPosts ? (
            <div className="text-center py-8">
              <Loader className="animate-spin mx-auto text-green-600" size={24} />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {isOwnProfile ? 'Ainda não publicaste nada' : 'Sem posts ainda'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
