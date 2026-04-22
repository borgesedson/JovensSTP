import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Chat, Channel, MessageList, Thread, Window, ChannelList, useChatContext } from 'stream-chat-react'
import { ChatChannelHeader } from '../components/ChatChannelHeader'
import { CustomMessageInput } from '../components/CustomMessageInput'
import { TranslatedMessage } from '../components/TranslatedMessage'
import { useStreamChat } from '../hooks/useStreamChat'
import { useMessageNotifications } from '../hooks/useMessageNotifications'
import { NewChatModal } from '../components/NewChatModal'
import { BottomNav } from '../components/BottomNav'
import { useAuth } from '../hooks/useAuth'
import { db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import 'stream-chat-react/dist/css/v2/index.css'
import '../styles/stream-chat-theme.css'

const communityMetaCache = new Map()

function ChannelPreviewItem(props) {
  const { channel, onSelect, setActiveChannel } = props
  const { client } = useChatContext()
  const navigate = useNavigate()
  const currentUserId = client?.userID
  const onChannelSelect = onSelect || setActiveChannel
  
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
      if (channelId.startsWith('community-')) {
        if (channel.data?.name) return
        const cached = communityMetaCache.get(channelId)
        if (cached) {
          setOverride({ title: cached.title || null, image: cached.image || null })
          return
        }
        try {
          const commId = channelId.replace('community-', '')
          const snap = await getDoc(doc(db, 'communities', commId))
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
      } else if (otherUserId) {
        const cached = communityMetaCache.get(otherUserId)
        if (cached) {
          setOverride({ title: cached.title || null, image: cached.image || null })
          return
        }
        try {
          const snap = await getDoc(doc(db, 'users', otherUserId))
          const data = snap.exists() ? snap.data() : null
          const title = data?.displayName || data?.name || null
          const image = data?.photoURL || data?.avatarUrl || null
          if (title || image) {
            communityMetaCache.set(otherUserId, { title, image })
            setOverride({ title, image })
          }
        } catch (err) {
          void err
        }
      }
    }
    run()
  }, [channelId, channel.data?.name, otherUserId])

  useEffect(() => {
    if (!otherUserId) return
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
        if (onChannelSelect) {
          onChannelSelect(channel)
        }
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
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg"
            style={{ display: (override.image || displayImage) ? 'none' : 'flex' }}
          >
            {(override.title || displayTitle)?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          {otherUserId && (
            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${isOnline ? 'bg-green-500' : 'bg-gray-300'} border-2 border-white rounded-full`}></div>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between mb-1">
            <p className="font-bold text-sm truncate">
              {override.title || displayTitle}
            </p>
            <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
              {timeText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 truncate flex-1">
              {lastMessage?.text || 'Nenhuma mensagem ainda'}
            </p>
            {unreadCount > 0 && (
              <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 font-bold">
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
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeChannel, setActiveChannel] = useState(null)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [loadingChannel, setLoadingChannel] = useState(false)
  const [viewportHeight, setViewportHeight] = useState('100dvh')
  const [showUnavailable, setShowUnavailable] = useState(false)
  
  const filters = useMemo(() => ({
    type: 'messaging',
    members: { $in: [chatClient?.userID || user?.uid].filter(Boolean) }
  }), [chatClient?.userID, user?.uid])

  const sort = useMemo(() => [{ last_message_at: -1 }], [])
  
  const listOptions = useMemo(() => ({
    state: true,
    watch: true,
    presence: true,
    limit: 20
  }), [])

  useEffect(() => {
    if (!window.visualViewport) return
    const handleResize = () => setViewportHeight(`${window.visualViewport.height}px`)
    window.visualViewport.addEventListener('resize', handleResize)
    handleResize()
    return () => window.visualViewport.removeEventListener('resize', handleResize)
  }, [])

  useMessageNotifications()

  const isHandlingState = useRef(false);

  useEffect(() => {
    if (!chatClient || isHandlingState.current) return;
    const searchParams = new URLSearchParams(location.search);
    const channelIdFromQuery = searchParams.get('channel');
    const { channelId: channelIdFromState, activeChannel: channelFromState } = location.state || {};
    const channelId = channelIdFromQuery || channelIdFromState;

    if (!channelId || activeChannel?.id === channelId) return;

    const openChannel = async () => {
      isHandlingState.current = true;
      setLoadingChannel(true);
      try {
        if (channelFromState) {
          setActiveChannel(channelFromState);
        } else {
          const channel = chatClient.channel('messaging', channelId);
          await channel.watch();
          setActiveChannel(channel);
        }
        if (channelIdFromQuery) {
          navigate('/chat', { replace: true, state: { chatOpen: true } });
        }
      } catch (error) {
        console.error('Erro ao abrir canal:', error);
      } finally {
        setLoadingChannel(false);
        isHandlingState.current = false;
      }
    };
    openChannel();
  }, [chatClient, activeChannel?.id, navigate, location.search, location.state]);

  useEffect(() => {
    if (location.pathname !== '/chat') return;
    const isChatOpen = Boolean(activeChannel);
    const currentState = Boolean(location.state?.chatOpen);
    if (isChatOpen !== currentState) {
      navigate('/chat', { 
        replace: true, 
        state: { ...(location.state || {}), chatOpen: isChatOpen } 
      });
    }
  }, [activeChannel, location.pathname, location.state?.chatOpen, navigate]);

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

  if (loading || loadingChannel) {
    return (
      <div className="flex items-center justify-center h-screen pb-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">
            {loadingChannel ? 'Abrindo conversa...' : 'Carregando...'}
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
            <button onClick={() => window.location.reload()} className="text-green-600 font-bold">Recarregar</button>
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

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 pt-[72px] pb-16 overflow-hidden overscroll-auto" style={{ height: viewportHeight }}>
      <div className="max-w-4xl mx-auto px-0 md:px-6 w-full flex-1 flex flex-col min-h-0">
        <div className="flex w-full flex-1 min-h-0 relative bg-white md:rounded-t-2xl shadow-sm overflow-hidden">
          {/* Sidebar */}
          <div className={`${activeChannel ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 bg-white flex-col border-r border-gray-100`}>
            <div className="bg-white p-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Mensagens</h2>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="w-full bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition text-sm font-semibold shadow-sm"
              >
                + Nova Conversa
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ChannelList
                filters={filters}
                sort={sort}
                options={listOptions}
                onSelect={(channel) => setActiveChannel(channel)}
                Preview={(props) => (
                  <ChannelPreviewItem 
                    {...props} 
                    setActiveChannel={(c) => setActiveChannel(c)} 
                  />
                )}
              />
            </div>
          </div>

          {/* Chat Area */}
          {activeChannel ? (
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              <Chat client={chatClient} theme="messaging light">
                <Channel channel={activeChannel}>
                  <Window>
                    <ChatChannelHeader onBack={() => setActiveChannel(null)} />
                    <div className="flex-1 relative flex flex-col min-h-0">
                      <MessageList Message={TranslatedMessage} />
                    </div>
                    <CustomMessageInput />
                  </Window>
                  <Thread />
                </Channel>
              </Chat>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50/50">
              <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💬</span>
                </div>
                <h3 className="text-gray-900 text-lg font-bold">Tuas conversas</h3>
                <p className="text-gray-500 text-sm mt-1">Seleciona uma conversa para começar.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onSelectUser={(c) => setActiveChannel(c)}
        />
      )}
    </div>
  )
}
