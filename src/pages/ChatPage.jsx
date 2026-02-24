import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Chat, Channel, ChannelHeader, MessageList, Thread, Window, ChannelList } from 'stream-chat-react'
import { ChatChannelHeader } from '../components/ChatChannelHeader'
import { CustomMessageInput } from '../components/CustomMessageInput'
// Removed Firestore profile loading (restored default Stream rendering)
import { useStreamChat } from '../hooks/useStreamChat'
import { useMessageNotifications } from '../hooks/useMessageNotifications'
import { NewChatModal } from '../components/NewChatModal'
import { BottomNav } from '../components/BottomNav'
import { Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import 'stream-chat-react/dist/css/v2/index.css'
import '../styles/stream-chat-theme.css'
import { db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'

const sort = [{ last_message_at: -1 }]
const communityMetaCache = new Map()

function ChannelPreviewItem(props) {
  const { channel, setActiveChannel: setActive, currentUserId, navigate, onChannelSelect, client } = props
  const [override, setOverride] = useState({ title: null, image: null })
  const [isOnline, setIsOnline] = useState(false)

  const lastMessage = channel.state.messages[channel.state.messages.length - 1]
  const unreadCount = channel.state.unreadCount
  const timestamp = lastMessage?.created_at

  let displayTitle = 'Conversa'
  let displayImage = null
  let otherUserId = null
  let communityId = null
  const channelId = channel.id || ''
  const memberEntries = Object.values(channel.state?.members || {})

  if (channelId.startsWith('community-')) {
    displayTitle = channel.data?.name || 'Comunidade'
    displayImage = channel.data?.image || null
    communityId = channelId.replace('community-', '')
    if (!channel.data?.name) {
      const cached = communityMetaCache.get(channelId)
      if (cached) {
        displayTitle = cached.title || displayTitle
        displayImage = cached.image || displayImage
      }
    }
  } else if (memberEntries.length === 2 || (channel.data?.members?.length === 2)) {
    const memberIds = channel.data?.members || []
    const other = memberEntries.find(m => m.user?.id !== currentUserId)
    const idToUse = other?.user?.id || memberIds.find(id => id !== currentUserId)

    if (idToUse) {
      displayTitle = other?.user?.name || other?.user?.id || idToUse || 'Conversa'
      displayImage = other?.user?.image || null
      otherUserId = idToUse
    }
  } else if (channel.data?.name) {
    displayTitle = channel.data.name
    displayImage = channel.data.image || null
  }

  useEffect(() => {
    const run = async () => {
      if (!channelId.startsWith('community-')) return
      if (channel.data?.name) return
      const cached = communityMetaCache.get(channelId)
      if (cached) {
        setOverride({ title: cached.title || null, image: cached.image || null })
        return
      }
      try {
        const communityId = channelId.replace('community-', '')
        const snap = await getDoc(doc(db, 'communities', communityId))
        const data = snap.exists() ? snap.data() : null
        const title = data?.name ? String(data.name) : null
        const image = data?.imageUrl ? String(data.imageUrl) : null
        if (title || image) {
          communityMetaCache.set(channelId, { title, image })
          setOverride({ title, image })
        }
      } catch (err) {
        void err
      }
    }
    run()
  }, [channelId, channel.data?.name])

  // Presence updates
  useEffect(() => {
    if (!otherUserId) return
    // Initialize from current member data
    const memberEntries = Object.values(channel.state?.members || {})
    const other = memberEntries.find(m => m.user?.id === otherUserId)
    if (other?.user) setIsOnline(Boolean(other.user.online))

    const offClient = client?.on('user.presence.changed', (event) => {
      if (event?.user?.id === otherUserId) {
        setIsOnline(Boolean(event.user.online))
      }
    })

    const offChannel = channel.on('member.updated', (event) => {
      if (event?.user?.id === otherUserId) {
        setIsOnline(Boolean(event.user.online))
      }
    })

    return () => {
      if (typeof offClient === 'function') offClient()
      if (typeof offChannel === 'function') offChannel()
    }
  }, [client, channel, otherUserId])

  // Format timestamp
  let timeText = ''
  if (timestamp) {
    const now = new Date()
    const msgDate = new Date(timestamp)
    const diffMs = now - msgDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) timeText = 'agora'
    else if (diffMins < 60) timeText = `${diffMins}m`
    else if (diffHours < 24) timeText = `${diffHours}h`
    else if (diffDays < 7) timeText = `${diffDays}d`
    else timeText = msgDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div
      onClick={() => {
        setActive(channel)
        if (onChannelSelect) onChannelSelect(channel)
      }}
      className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (otherUserId) {
              navigate(`/profile/${otherUserId}`)
            } else if (communityId) {
              navigate(`/communities/${communityId}`)
            }
          }}
          className="relative flex-shrink-0 focus:outline-none hover:opacity-80 transition"
          disabled={!otherUserId && !communityId}
        >
          {(override.image || displayImage) ? (
            <img
              src={override.image || displayImage}
              alt={override.title || displayTitle}
              className="w-14 h-14 rounded-full object-cover"
              onError={(e) => {
                // Se a imagem falhar ao carregar, esconde e mostra o fallback
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg"
            style={{ display: (override.image || displayImage) ? 'none' : 'flex' }}
          >
            {(override.title || displayTitle)?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          {otherUserId && (
            <div className={`absolute bottom-0 right-0 w-4 h-4 ${isOnline ? 'bg-green-500' : 'bg-gray-300'} border-2 border-white rounded-full`}></div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <p className="font-bold text-sm truncate">
              {override.title || displayTitle}
            </p>
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
              {timeText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 truncate flex-1">
              {lastMessage?.text || 'Nenhuma mensagem ainda'}
            </p>
            {unreadCount > 0 && (
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0 font-medium">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const ChatPage = () => {
  const { chatClient, loading } = useStreamChat()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeChannel, setActiveChannel] = useState(null)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [loadingChannel, setLoadingChannel] = useState(false)
  // Temporariamente desativado enquanto usamos o renderer padrão
  const [showUnavailable, setShowUnavailable] = useState(false)
  // const [memberProfiles, setMemberProfiles] = useState({})
  // const [headerInfo, setHeaderInfo] = useState({ name: '', image: null })

  // Ativar notificações de mensagens
  useMessageNotifications()

  // Verificar se há um canal para abrir (query param, state ou diretamente)
  useEffect(() => {
    const openChannelFromState = async () => {
      if (!chatClient) return

      // Suporte para query param ?channel=xxx
      const searchParams = new URLSearchParams(location.search)
      const channelIdFromQuery = searchParams.get('channel')

      // Suporte para location.state (navegação interna)
      const { channelId: channelIdFromState, activeChannel: channelFromState } = location.state || {}

      const channelId = channelIdFromQuery || channelIdFromState

      if (channelId && !activeChannel) {
        setLoadingChannel(true)
        try {
          // Se o canal já foi passado via state, usa ele diretamente
          if (channelFromState) {
            setActiveChannel(channelFromState)
          } else {
            // Senão, busca o canal pelo ID
            const channel = chatClient.channel('messaging', channelId)
            await channel.watch()
            setActiveChannel(channel)
          }

          // Limpar query param após abrir o canal
          if (channelIdFromQuery) {
            navigate('/chat', { replace: true, state: { chatOpen: true } })
          }
        } catch (error) {
          console.error('Erro ao abrir canal:', error)
          toast.error('Erro ao abrir conversa')
        } finally {
          setLoadingChannel(false)
        }
      }
    }

    openChannelFromState()
  }, [chatClient, location.search, location.state, activeChannel, navigate])

  // Reflect whether a channel is open into route state so BottomNav can hide
  useEffect(() => {
    if (location.pathname !== '/chat') return
    const desired = Boolean(activeChannel)
    const current = Boolean(location.state?.chatOpen)
    if (desired !== current) {
      navigate('/chat', { replace: true, state: { ...(location.state || {}), chatOpen: desired } })
    }
  }, [activeChannel, location.pathname, location.state, navigate])

  // (Perf improvement) Custom profile/header loading desativado enquanto resolvemos bug de renderização.
  // Grace period: show a light "Carregando..." before rendering "não disponível"
  useEffect(() => {
    if (loading) {
      setShowUnavailable(false)
      return
    }
    if (chatClient) {
      setShowUnavailable(false)
      return
    }
    const t = setTimeout(() => setShowUnavailable(true), 2000)
    return () => clearTimeout(t)
  }, [loading, chatClient])



  // Usar header padrão do Stream temporariamente

  if (loading || loadingChannel) {
    return (
      <div className="flex items-center justify-center h-screen pb-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">
            {loadingChannel ? 'A abrir conversa...' : 'Carregando...'}
          </p>
        </div>
      </div>
    )
  }

  if (!chatClient) {
    if (showUnavailable) {
      return (
        <div className="flex items-center justify-center h-screen pb-24">
          <div className="text-center max-w-md p-6">
            <p className="text-gray-600 mb-2">Chat não disponível.</p>
            <p className="text-gray-400 text-sm mb-4">Verifique sua configuração do GetStream.</p>
            {import.meta.env.DEV && (
              <a
                href="https://getstream.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                Criar conta na GetStream →
              </a>
            )}
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center h-screen pb-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Conectando ao chat...</p>
        </div>
      </div>
    )
  }

  const { user } = useAuth()
  const customFilters = {
    type: 'messaging',
    members: { $in: [chatClient?.userID || user?.uid] }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 pt-14 pb-16">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 md:px-6 w-full">
        <div className="flex w-full h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100vh-3.5rem-4rem)]">
          {/* Channel List (Sidebar) */}
          <div className={`${activeChannel ? 'hidden md:flex' : 'flex'} w-full md:w-96 bg-white flex-col`}>
            <div className="bg-white p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold mb-3">Mensagens</h2>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="w-full bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition text-sm font-medium"
              >
                + Nova Conversa
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ChannelList
                filters={customFilters}
                sort={sort}
                options={{ limit: 20 }}
                onSelect={(channel) => setActiveChannel(channel)}
                Preview={(p) => (
                  <ChannelPreviewItem {...p} client={chatClient} currentUserId={chatClient?.userID} navigate={navigate} onChannelSelect={setActiveChannel} />
                )}
              />
            </div>
          </div>

          {/* Channel Messages */}
          <div className={`${activeChannel ? 'flex' : 'hidden md:flex'} flex-1 bg-white border-l border-gray-200`}>
            {activeChannel ? (
              <Channel channel={activeChannel}>
                <Window>
                  {/* Header custom seguro + header padrão fold (pode remover ChannelHeader se quiser só o custom) */}
                  <ChatChannelHeader onChannelDeleted={() => setActiveChannel(null)} onBack={() => setActiveChannel(null)} />
                  {/* Mantemos ChannelHeader oculto via CSS util se quiser informações extra futuramente */}
                  <div className="hidden"><ChannelHeader /></div>
                  <MessageList />
                  <CustomMessageInput />
                </Window>
                <Thread />
              </Channel>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center p-6">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">💬</span>
                  </div>
                  <p className="text-gray-600 text-lg font-medium mb-2">
                    Seleciona uma conversa
                  </p>
                  <p className="text-gray-400 text-sm">
                    ou começa uma nova!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Nova Conversa */}
        {showNewChatModal && (
          <NewChatModal
            onClose={() => setShowNewChatModal(false)}
            onSelectUser={(channel) => setActiveChannel(channel)}
          />
        )}

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div >
  )
}
