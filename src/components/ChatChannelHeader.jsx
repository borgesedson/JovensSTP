import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useChannelStateContext, useChatContext } from 'stream-chat-react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Trash2, RotateCcw, EyeOff, Globe2, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../services/firebase'
import { db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import CallButtons from './CallButtons'

/*
  ChatChannelHeader: header seguro que não interfere com MessageList.
  Regras:
  - Comunidade: id começa com community- => usa channel.data.name e imagem se existir
  - DM (2 membros): mostra o outro membro (user diferente de chatClient.userID)
  - Fallback avatar: letra inicial em gradiente verde
*/
export const ChatChannelHeader = ({ onChannelDeleted, onBack }) => {
  const { channel } = useChannelStateContext()
  const { client } = useChatContext()
  const currentUserId = client?.userID
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [lastActive, setLastActive] = useState(null)

  const [overrideTitle, setOverrideTitle] = useState(null)
  const [overrideImage, setOverrideImage] = useState(null)

  const { title, image, isDM, otherUserId, communityId } = useMemo(() => {
    if (!channel) return { title: 'Chat', image: null, isDM: false, otherUserId: null, communityId: null }
    const id = channel.id || ''

    // Comunidade
    if (id.startsWith('community-')) {
      return {
        title: channel.data?.name || 'Comunidade',
        image: channel.data?.image || null,
        isCommunity: true,
        isDM: false,
        otherUserId: null,
        communityId: id.replace('community-', '')
      }
    }

    // DM: 2 membros
    const memberEntries = Object.values(channel.state?.members || {})
    const memberIds = channel.data?.members || []

    if (memberEntries.length === 2 || memberIds.length === 2) {
      // Prioritize memberEntries user data, fallback to channel.data.members list
      const other = memberEntries.find(m => m.user?.id !== currentUserId)
      const otherId = other?.user?.id || memberIds.find(id => id !== currentUserId)

      if (otherId) {
        return {
          title: other?.user?.name || other?.user?.id || 'Conversa',
          image: other?.user?.image || null,
          isCommunity: false,
          isDM: true,
          otherUserId: otherId,
          communityId: null
        }
      }
    }

    // Canal nomeado normal
    if (channel.data?.name) {
      return { title: channel.data.name, image: channel.data.image || null, isCommunity: false, isDM: false, otherUserId: null, communityId: null }
    }

    return { title: 'Conversa', image: null, isCommunity: false, isDM: false, otherUserId: null, communityId: null }
  }, [channel, currentUserId])

  useEffect(() => {
    if (!channel || !otherUserId) return

    const memberEntries = Object.values(channel.state?.members || {})
    const other = memberEntries.find(m => m.user?.id === otherUserId)
    if (other?.user) {
      setIsOnline(Boolean(other.user.online))
      setLastActive(other.user.last_active || null)
    }

    const offClient = client?.on('user.presence.changed', (event) => {
      if (event?.user?.id === otherUserId) {
        setIsOnline(Boolean(event.user.online))
        setLastActive(event.user.last_active || null)
      }
    })

    const offChannel = channel.on('member.updated', (event) => {
      if (event?.user?.id === otherUserId) {
        setIsOnline(Boolean(event.user.online))
        setLastActive(event.user.last_active || null)
      }
    })

    return () => {
      if (typeof offClient === 'function') offClient()
      if (typeof offChannel === 'function') offChannel()
    }
  }, [channel, client, otherUserId])

  // Fallback: se for comunidade e não houver name no Stream, buscar do Firestore
  useEffect(() => {
    const fetchCommunityMeta = async () => {
      if (!channel) return
      const id = channel.id || ''
      if (!id.startsWith('community-')) return
      const hasName = Boolean(channel.data?.name)
      if (hasName) return
      try {
        const communityId = id.replace('community-', '')
        const snap = await getDoc(doc(db, 'communities', communityId))
        const data = snap.exists() ? snap.data() : null
        if (data?.name) setOverrideTitle(String(data.name))
        if (data?.imageUrl) setOverrideImage(String(data.imageUrl))
      } catch (err) {
        void err
      }
    }
    fetchCommunityMeta()
  }, [channel])

  const canHardDelete = useMemo(() => {
    if (!channel || !isDM) return false
    // Apenas quem criou o canal pode tentar delete; mesmo assim pode falhar sem permissões de servidor
    const creatorId = channel.data?.created_by_id || channel?.created_by?.id
    return creatorId === currentUserId
  }, [channel, isDM, currentUserId])

  const handleDeleteConversation = async () => {
    if (!channel) return
    if (!canHardDelete) return handleHideConversation() // fallback
    if (!confirm('Apagar totalmente esta conversa para todos?')) return
    try {
      await channel.delete()
      toast.success('Conversa apagada')
      setMenuOpen(false)
      onChannelDeleted?.()
    } catch (e) {
      console.error(e)
      toast.error('Sem permissão para apagar. A ocultar em vez disso...')
      await handleHideConversation(true)
    }
  }

  const handleHideConversation = async (skipConfirm = false) => {
    if (!channel) return
    if (!skipConfirm && !confirm('Ocultar esta conversa? Volta a aparecer se chegar nova mensagem.')) return
    try {
      await channel.hide({ clear_history: true })
      toast.success('Conversa ocultada')
      setMenuOpen(false)
      onChannelDeleted?.()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao ocultar conversa')
    }
  }

  // Permissão heurística para mostrar ação global (validação real no backend)
  const canGlobalTruncate = useMemo(() => {
    if (!channel) return false
    const id = channel.id || ''
    if (id.startsWith('community-')) {
      const creatorId = channel.data?.created_by_id || channel?.created_by?.id
      return creatorId === currentUserId
    }
    if (isDM) return true
    return false
  }, [channel, isDM, currentUserId])

  const handleGlobalTruncate = async () => {
    if (!channel) return
    if (!confirm('Limpar histórico para TODOS os membros?')) return
    try {
      const functions = getFunctions(app)
      const fn = httpsCallable(functions, 'manageChannelModeration')
      await fn({ channelId: channel.id, action: 'truncate' })
      toast.success('Histórico global limpo')
      setMenuOpen(false)
    } catch (e) {
      console.error(e)
      const msg = (e && e.message) ? e.message : ''
      // Firebase callable errors surface in e.code when using SDK
      // Provide mensagem amigável
      if (msg.includes('permission') || msg.includes('Permission')) {
        toast.error('Sem permissão para limpeza global')
      } else {
        toast.error('Falha ao limpar globalmente')
      }
    }
  }

  // Limpar histórico apenas para o utilizador atual (hide + clear_history) – local.
  const handleClearLocal = async () => {
    if (!channel) return
    if (!confirm('Limpar histórico local desta conversa? (Só para ti)')) return
    try {
      await channel.hide({ clear_history: true })
      toast.success('Histórico limpo localmente')
      setMenuOpen(false)
      onChannelDeleted?.()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao limpar histórico local')
    }
  }

  const handleAvatarClick = () => {
    if (otherUserId) {
      navigate(`/profile/${otherUserId}`)
    } else if (communityId) {
      navigate(`/communities/${communityId}`)
    }
  }

  return (
    <div className="relative border-b border-gray-200 px-4 py-3 flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="md:hidden p-2 -ml-2 mr-1 rounded-md hover:bg-gray-100 text-gray-600"
          aria-label="Voltar para lista"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <button
        onClick={handleAvatarClick}
        className="flex-shrink-0 focus:outline-none hover:opacity-80 transition"
        disabled={!otherUserId && !communityId}
      >
        {(overrideImage || image) ? (
          <img src={overrideImage || image} alt={overrideTitle || title} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm">
            {(overrideTitle || title).charAt(0).toUpperCase()}
          </div>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-medium text-sm truncate">{overrideTitle || title}</p>
          {isDM && otherUserId && (
            <span
              className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
              aria-label={isOnline ? 'Online' : 'Offline'}
              title={isOnline ? 'Online' : 'Offline'}
            />
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          {isDM && otherUserId
            ? (isOnline
              ? 'Online agora'
              : (lastActive
                ? `Visto ${formatDistanceToNow(new Date(lastActive), { addSuffix: true, locale: ptBR })}`
                : 'Offline'))
            : 'Mensagens seguras'}
        </p>
      </div>

      {/* Botões de chamada (apenas para DMs) */}
      {isDM && otherUserId && (
        <CallButtons
          userId={otherUserId}
          userName={title}
          userImage={image}
          className="mr-2"
        />
      )}

      <div className="ml-auto">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
          aria-label="Opções"
        >
          <MoreVertical size={18} />
        </button>
      </div>
      {menuOpen && (
        <div className="absolute top-12 right-4 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
          <ul className="text-sm">
            <li>
              <button
                onClick={handleClearLocal}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                title="Remove o histórico só para ti"
              >
                <RotateCcw size={14} className="text-gray-500" /> Limpar (só para mim)
              </button>
            </li>
            {canGlobalTruncate && (
              <li>
                <button
                  onClick={handleGlobalTruncate}
                  className="w-full text-left px-4 py-2 hover:bg-orange-50 flex items-center gap-2 text-orange-600"
                  title="Limpa para todos via servidor"
                >
                  <Globe2 size={14} /> Limpar (global)
                </button>
              </li>
            )}
            {isDM && (
              <li>
                <button
                  onClick={handleDeleteConversation}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600"
                >
                  {canHardDelete ? <Trash2 size={14} /> : <EyeOff size={14} />}
                  {canHardDelete ? 'Apagar conversa' : 'Ocultar conversa'}
                </button>
              </li>
            )}
            {!isDM && (
              <li>
                <div className="px-4 py-2 text-xs text-gray-400 select-none border-t border-gray-100">Apagar completo só em DMs</div>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
