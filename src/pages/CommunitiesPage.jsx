import { useEffect, useState, useMemo, useCallback, useContext, useRef } from 'react'
import { useStreamChat } from '../hooks/useStreamChat'
import { useAuth } from '../hooks/useAuth'
import { Users, MessageCircle, Loader, Search, X, BookOpen, ExternalLink, FileText, CheckCircle2 } from 'lucide-react'
import { getAcademyContent } from '../services/academy'
import toast from 'react-hot-toast'
import { db } from '../services/firebase'
import { collection, onSnapshot, orderBy, query, updateDoc, doc, arrayRemove, arrayUnion, where, addDoc, serverTimestamp, getDocs, deleteDoc, getDoc } from 'firebase/firestore'
import { AudioRoomCard } from '../components/AudioRoomCard'
import { AudioRoomModal } from '../components/AudioRoomModal'
import { CreateCommunityModal } from '../components/CreateCommunityModal'
import CoursesPage from './CoursesPage'
// removed functions/app imports to avoid unused warnings

export const CommunitiesPage = () => {
  const { chatClient, loading: chatLoading } = useStreamChat()
  const { user } = useAuth()
  // const navigate = useNavigate() // (reservado para navegação futura a página detalhada da comunidade)
  const [joiningCommunity, setJoiningCommunity] = useState(null)
  const [communities, setCommunities] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({}) // { communityId: unreadCount }
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('canal') // 'canal' | 'live' | 'learning'
  const [pendingJoins, setPendingJoins] = useState({}) // { [communityId]: true }
  const [activeLivesCount, setActiveLivesCount] = useState(0)
  const [activeLives, setActiveLives] = useState([])
  const [showCreateLive, setShowCreateLive] = useState(false)
  const [createLiveTitle, setCreateLiveTitle] = useState('')
  const [createLiveDescription, setCreateLiveDescription] = useState('')
  const [creatingLive, setCreatingLive] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [userHasActiveLive, setUserHasActiveLive] = useState(false)
  const [academyItems, setAcademyItems] = useState([])
  const [academyLoading, setAcademyLoading] = useState(false)
  const [academyCategory, setAcademyCategory] = useState('all')

  // Carregar comunidades em tempo real
  useEffect(() => {
    const ref = collection(db, 'communities')
    // Ordena por tamanho do array 'members' se existir, fallback para createdAt
    const q = query(ref, orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, async (snap) => {
      const rawList = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const lenA = a.members?.length || 0
          const lenB = b.members?.length || 0
          if (lenA !== lenB) return lenB - lenA // mais membros primeiro
          // desempate por data de criação (mais recente primeiro)
          const tsA = a.createdAt?.toMillis?.() || 0
          const tsB = b.createdAt?.toMillis?.() || 0
          return tsB - tsA
        })

      // Buscar todos os membros únicos (ou owner se preferir)
      const allMemberIds = Array.from(new Set(rawList.flatMap(c => Array.isArray(c.members) ? c.members : []).filter(Boolean)))
      // Buscar todos os usuários de uma vez
      const userDocs = await Promise.all(allMemberIds.map(uid =>
        uid ? getDoc(doc(db, 'users', uid)) : null
      ))
      const existingUserIds = new Set(
        userDocs
          .map((snap, i) => (snap && snap.exists() && allMemberIds[i]) ? allMemberIds[i] : null)
          .filter(Boolean)
      )
      // Filtrar comunidades apenas com membros existentes
      const filteredList = rawList.filter(c =>
        Array.isArray(c.members) && c.members.some(uid => existingUserIds.has(uid))
      )
      setCommunities(filteredList)
    })
    return () => unsub()
  }, [])

  // Buscar unread counts das comunidades onde o usuário é membro
  useEffect(() => {
    if (!chatClient || !user || communities.length === 0) return

    const fetchUnreadCounts = async () => {
      try {
        const counts = {}

        // Filtrar apenas comunidades onde o usuário é membro
        const memberCommunities = communities.filter(c => c.members?.includes(user.uid))

        for (const community of memberCommunities) {
          const channelId = `community-${community.id}`
          try {
            const channel = chatClient.channel('messaging', channelId)
            await channel.watch()
            const unreadCount = channel.countUnread()
            if (unreadCount > 0) {
              counts[community.id] = unreadCount
            }
          } catch (err) {
            console.log(`Canal ${channelId} não encontrado ou erro:`, err.message)
          }
        }

        setUnreadCounts(counts)
      } catch (error) {
        console.error('Erro ao buscar unread counts:', error)
      }
    }

    fetchUnreadCounts()

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchUnreadCounts, 30000)
    return () => clearInterval(interval)
  }, [chatClient, user, communities])

  // Carregar conteúdo da Academia
  useEffect(() => {
    if (activeTab !== 'learning') return

    const loadAcademy = async () => {
      setAcademyLoading(true)
      const items = await getAcademyContent(academyCategory)
      setAcademyItems(items)
      setAcademyLoading(false)
    }

    loadAcademy()
  }, [activeTab, academyCategory])

  // Listar e contar lives ativas globais (audioRooms status=active)
  useEffect(() => {
    const ref = collection(db, 'audioRooms')
    const q = query(ref, where('status', '==', 'active'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setActiveLives(list)
      setActiveLivesCount(list.length)
      // Verificar se o user tem live ativa como host
      if (user) {
        const userLive = list.find(room => room.hostId === user.uid)
        setUserHasActiveLive(!!userLive)
      }
    })
    return () => unsub()
  }, [user])

  // Escutar pedidos pendentes de entrada do usuário nas comunidades
  useEffect(() => {
    if (!user) {
      setPendingJoins({})
      return
    }
    const ref = collection(db, 'joinRequests')
    const q = query(ref, where('userId', '==', user.uid), where('status', '==', 'pending'))
    const unsub = onSnapshot(q, (snap) => {
      const map = {}
      snap.docs.forEach(d => {
        const data = d.data()
        if (data.communityId) map[data.communityId] = true
      })
      setPendingJoins(map)
    })
    return () => unsub()
  }, [user])

  const isMember = (community) => community?.members?.includes?.(user?.uid)

  // Filtrar comunidades pela busca (Otimizado com useMemo)
  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return communities

    const query = searchQuery.toLowerCase()
    return communities.filter(community => {
      const name = community.name?.toLowerCase() || ''
      const description = community.description?.toLowerCase() || ''
      return name.includes(query) || description.includes(query)
    })
  }, [communities, searchQuery])

  const handleJoinCommunity = async (community) => {
    setJoiningCommunity(community.id)
    try {
      const communityRef = doc(db, 'communities', community.id)
      if (isMember(community)) {
        await updateDoc(communityRef, { members: arrayRemove(user.uid) })
        toast('Saíste da comunidade', { icon: '👋' })
      } else {
        // Entrada direta: adiciona o usuário à lista de membros
        if (community?.banned?.includes(user.uid)) {
          toast('Não podes entrar: banido da comunidade', { icon: '⛔' })
          return
        }
        await updateDoc(communityRef, { members: arrayUnion(user.uid) })
        toast('Entraste na comunidade!', { icon: '🎉' })
      }
    } catch (error) {
      console.error('Erro ao entrar na comunidade:', error)
      toast.error('Erro ao atualizar comunidade')
    } finally {
      setJoiningCommunity(null)
    }
  }

  const handleCancelJoinRequest = async (community) => {
    try {
      const ref = collection(db, 'joinRequests')
      const q = query(ref, where('communityId', '==', community.id), where('userId', '==', user.uid), where('status', '==', 'pending'))
      const snap = await getDocs(q)
      if (snap.empty) return
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
      toast('Pedido cancelado', { icon: '🗑️' })
    } catch (e) {
      console.error('Erro ao cancelar pedido:', e)
      toast.error('Não foi possível cancelar o pedido')
    }
  }

  if (chatLoading) {
    return (
      <div className="flex items-center justify-center h-screen pb-24">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-green-600" size={32} />
          <p className="text-gray-600">Carregando comunidades...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-14">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 md:px-6">
        {/* Header (scoped to tab) */}
        <div className="bg-white p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {activeTab === 'canal' ? 'Canais' : activeTab === 'live' ? 'Live' : 'Learning'}
              {activeTab === 'live' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                  {activeLivesCount} ao vivo
                </span>
              )}
            </h1>
            {user && activeTab === 'canal' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 shadow"
              >
                + Novo canal
              </button>
            )}
            {user && activeTab === 'live' && (
              <button
                onClick={() => {
                  if (userHasActiveLive) {
                    toast.error('Já tens uma live ativa. Encerra-a primeiro.')
                    return
                  }
                  setShowCreateLive(true)
                }}
                disabled={userHasActiveLive}
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                title={userHasActiveLive ? 'Já tens uma live ativa' : 'Criar nova live'}
              >
                + Nova live
              </button>
            )}
          </div>
          {activeTab === 'canal' && (
            <>
              <p className="text-sm text-gray-600 mb-3">Conecta-te com profissionais da tua área! 🤝</p>
              {/* Search Bar (only for canais) */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Procurar canais..."
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="mx-4 mb-4 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('canal')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'canal'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              Canal
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'live'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              🎙️ Live
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'learning'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              📚 Learning
            </button>
          </div>
        </div>

        {/* Chat não disponível */}
        {!chatClient && activeTab === 'canal' && (
          <div className="mx-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="text-yellow-800 text-xs">
              ⚠️ Chat não está disponível. As comunidades usam GetStream Chat.
            </p>
          </div>
        )}

        {/* Tab Content: Canal */}
        {activeTab === 'canal' && (
          <>
            <div className="px-4 space-y-3">
              {filteredCommunities.length === 0 && searchQuery ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  </div>
                  <p className="text-gray-600 font-medium">Nenhuma comunidade encontrada</p>
                  <p className="text-gray-400 text-sm mt-1">Tenta procurar com outras palavras</p>
                </div>
              ) : filteredCommunities.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Nenhuma comunidade ainda</p>
                  <p className="text-gray-400 text-sm mt-1">Sê o primeiro a criar uma!</p>
                </div>
              ) : (
                filteredCommunities.map((community) => {
                  const loadingThis = joiningCommunity === community.id
                  const member = isMember(community)
                  const membersCount = community?.members?.length || 0
                  const unreadCount = unreadCounts[community.id] || 0

                  return (
                    <div
                      key={community.id}
                      className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition relative"
                      onClick={(e) => {
                        // evitar clique do botão de entrar navegar
                        if ((e.target).closest('button')) return
                        window.location.href = `/communities/${community.id}`
                      }}
                    >
                      {/* Icon/Emoji/Image */}
                      <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded-xl text-2xl flex-shrink-0 overflow-hidden relative">
                        {community.imageUrl ? (
                          <img src={community.imageUrl} alt={community.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{community.emoji || '👥'}</span>
                        )}
                        {/* Badge de mensagens não lidas */}
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg border-2 border-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-base truncate">{community.name}</h3>
                        </div>
                        {community.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-1">{community.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            <span>{membersCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle size={14} />
                            <span>{membersCount > 0 ? 'Chat' : 'Novo'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Join/Leave / Pending Actions */}
                      <div className="flex items-center gap-2">
                        {pendingJoins[community.id] && !member ? (
                          <>
                            <button
                              disabled
                              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                              title="Pedido enviado. Aguardando aprovação"
                            >
                              ⏳ Pedido enviado
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancelJoinRequest(community) }}
                              className="px-3 py-2 text-sm font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                              title="Cancelar pedido"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleJoinCommunity(community)}
                            disabled={loadingThis || !user}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ${member
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-green-600 text-white hover:bg-green-700'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={!user ? 'Precisas entrar na conta' : member ? 'Sair da comunidade' : 'Entrar na comunidade'}
                          >
                            {loadingThis ? '...' : member ? 'Sair' : 'Entrar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* Tab Content: Live */}
        {activeTab === 'live' && (
          <div className="mx-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Lives ativas</h3>
                <span className="text-sm text-gray-600">{activeLivesCount} ao vivo</span>
              </div>
              {activeLivesCount === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Sem lives ativas no momento</p>
              ) : (
                <div className="space-y-3">
                  {activeLives.map(room => (
                    <AudioRoomCard key={room.id} room={room} onJoin={() => setSelectedRoom(room)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Learning (Cursos) */}
        {activeTab === 'learning' && (
          <div className="px-4 pb-20">
            <CoursesPage isTab={true} />
          </div>
        )}

        <CreateCommunityModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

        {/* Modal: Nova Live (global) */}
        {showCreateLive && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCreateLive(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Criar Live</h2>
                <button onClick={() => setShowCreateLive(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={createLiveTitle}
                    onChange={(e) => setCreateLiveTitle(e.target.value)}
                    maxLength={60}
                    placeholder="Ex: Networking de Carreira"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                  <textarea
                    value={createLiveDescription}
                    onChange={(e) => setCreateLiveDescription(e.target.value)}
                    rows={3}
                    maxLength={200}
                    placeholder="Sobre o que será esta live?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    onClick={() => setShowCreateLive(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={creatingLive || !createLiveTitle.trim()}
                    onClick={async () => {
                      if (!user) return
                      setCreatingLive(true)
                      try {
                        const newRoom = {
                          title: createLiveTitle.trim(),
                          description: createLiveDescription.trim(),
                          hostId: user.uid,
                          hostName: user.displayName || 'Host',
                          hostAvatar: user.photoURL || null,
                          status: 'active',
                          scope: 'global',
                          participants: [{
                            uid: user.uid,
                            name: user.displayName || 'Host',
                            avatar: user.photoURL || null,
                            role: 'host',
                            isSpeaking: false,
                            handRaised: false
                          }],
                          speakerIds: [user.uid],
                          listenerIds: [],
                          createdAt: serverTimestamp(),
                          startedAt: serverTimestamp()
                        }
                        const docRef = await addDoc(collection(db, 'audioRooms'), newRoom)
                        toast.success('Live criada! 🎙️')
                        setCreateLiveTitle('')
                        setCreateLiveDescription('')
                        setShowCreateLive(false)
                        // Abrir a sala automaticamente
                        setSelectedRoom({ ...newRoom, id: docRef.id })
                      } catch (e) {
                        console.error('Erro ao criar live', e)
                        toast.error('Erro ao criar live')
                      } finally {
                        setCreatingLive(false)
                      }
                    }}
                  >
                    {creatingLive ? 'A criar...' : 'Criar live'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: entrar numa live */}
        {selectedRoom && (
          <AudioRoomModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
        )}
      </div>
    </div>
  )
}
