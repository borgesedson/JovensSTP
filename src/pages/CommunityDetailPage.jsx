import { useEffect, useState, useMemo, useCallback, useContext, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStreamChat } from '../hooks/useStreamChat'
import { app, db, functions } from '../services/firebase'
import { httpsCallable } from 'firebase/functions'
import { doc, onSnapshot, updateDoc, arrayRemove, collection, query, orderBy, where, addDoc, serverTimestamp, deleteField, getDocs } from 'firebase/firestore'
import { Users, ChevronLeft, MessageCircle, Loader, Send, Image as ImageIcon, Settings, Shield } from 'lucide-react'
import { Chat, Channel, MessageList, MessageInput, Window, ChannelHeader, Thread } from 'stream-chat-react'
import 'stream-chat-react/dist/css/v2/index.css'
import { uploadUserAvatar } from '../services/storage'
import { EditCommunityModal } from '../components/EditCommunityModal'
import { ManageJoinRequestsModal } from '../components/ManageJoinRequestsModal'
import { ManageMembersModal } from '../components/ManageMembersModal'
import toast from 'react-hot-toast'

export const CommunityDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { chatClient, loading: chatLoading } = useStreamChat()

  const [community, setCommunity] = useState(null)
  const [joining, setJoining] = useState(false)
  const [openingChat, setOpeningChat] = useState(false)
  const [stories, setStories] = useState([])
  const [creatingStory, setCreatingStory] = useState(false)
  const [storyContent, setStoryContent] = useState('')
  const [storyImageFile, setStoryImageFile] = useState(null)
  const [storyImagePreview, setStoryImagePreview] = useState(null)
  const [loadingStories, setLoadingStories] = useState(true)
  const [membersData, setMembersData] = useState([])
  const [showManageRequests, setShowManageRequests] = useState(false)
  const [showManageMembers, setShowManageMembers] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showGuidelines, setShowGuidelines] = useState(false)

  useEffect(() => {
    const ref = doc(db, 'communities', id)
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        toast.error('Comunidade não encontrada')
        navigate('/communities')
        return
      }
      const data = { id: snap.id, ...snap.data() }
      setCommunity(data)
      // Guidelines banner on first visit
      if (data.guidelines && user?.uid) {
        const key = `guidelinesSeen:${data.id}:${user.uid}`
        if (!localStorage.getItem(key)) {
          setShowGuidelines(true)
        }
      }
    })
    return () => unsub()
  }, [id, navigate, user?.uid])

  const isMember = useMemo(() => {
    return !!community?.members?.includes?.(user?.uid)
  }, [community?.members, user?.uid])

  const isOwnerOrMod = useMemo(() => {
    if (!community || !user?.uid) return false
    if (community.createdBy === user.uid) return true
    const role = community.roles?.[user.uid]
    return role === 'owner' || role === 'mod'
  }, [community, user?.uid])

  // Carregar membros perfis
  useEffect(() => {
    if (!community?.members?.length) {
      setMembersData([])
      return
    }
    const unsubscribers = []
    const fetched = []
    community.members.forEach(uid => {
      const uref = doc(db, 'users', uid)
      const unsub = onSnapshot(uref, snap => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() }
          const idx = fetched.findIndex(m => m.id === snap.id)
            ; (idx >= 0 ? fetched.splice(idx, 1, data) : fetched.push(data))
          setMembersData([...fetched])
        }
      })
      unsubscribers.push(unsub)
    })
    return () => unsubscribers.forEach(fn => fn())
  }, [community?.members])

  // Stories da comunidade
  useEffect(() => {
    if (!community) return
    const sref = collection(db, 'stories')
    const q = query(sref, where('communityId', '==', id), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setStories(list)
      setLoadingStories(false)
    })
    return () => unsub()
  }, [community, id])

  const pinnedStory = useMemo(() => {
    if (!community?.pinnedStoryId) return null
    return stories.find(s => s.id === community.pinnedStoryId) || null
  }, [stories, community?.pinnedStoryId])

  const handleStoryImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)')
      return
    }
    setStoryImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setStoryImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const createCommunityStory = async (e) => {
    e.preventDefault()
    if (!storyContent.trim() && !storyImageFile) {
      toast.error('Escreve algo ou adiciona imagem')
      return
    }
    setCreatingStory(true)
    try {
      const data = {
        authorId: user.uid,
        authorName: user.displayName || 'Usuário',
        authorAvatar: user.photoURL || null,
        content: storyContent.trim(),
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
        communityId: id,
      }
      if (storyImageFile) {
        const url = await uploadUserAvatar(`community-stories/${user.uid}-${Date.now()}`, storyImageFile)
        data.imageUrl = url
      }
      await addDoc(collection(db, 'stories'), data)
      toast.success('Publicação enviada!')
      setStoryContent('')
      setStoryImageFile(null)
      setStoryImagePreview(null)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao publicar')
    } finally {
      setCreatingStory(false)
    }
  }

  const toggleMembership = async () => {
    if (!user) return
    setJoining(true)
    try {
      const ref = doc(db, 'communities', id)
      if (isMember) {
        await updateDoc(ref, { members: arrayRemove(user.uid) })
        toast('Saíste da comunidade', { icon: '👋' })
      } else {
        if (community?.banned?.includes(user.uid)) {
          toast('Não podes entrar: banido da comunidade', { icon: '⛔' })
          return
        }
        // Verificar se já tem pedido pendente
        const existingRequestsSnap = await getDocs(
          query(
            collection(db, 'joinRequests'),
            where('communityId', '==', id),
            where('userId', '==', user.uid),
            where('status', '==', 'pending')
          )
        )
        if (!existingRequestsSnap.empty) {
          toast('Já tens um pedido pendente. Aguarda aprovação.', { icon: '⏳' })
          return
        }
        // Sempre exige aprovação
        const reqRef = collection(db, 'joinRequests')
        await addDoc(reqRef, {
          communityId: id,
          userId: user.uid,
          userName: user.displayName || 'Utilizador',
          userPhoto: user.photoURL || null,
          status: 'pending',
          timestamp: serverTimestamp(),
        })
        toast('Pedido enviado! Aguarda aprovação do moderador.', { icon: '🕒' })
      }
    } catch (e) {
      console.error(e)
      toast.error('Erro ao atualizar comunidade')
      // fallback best-effort: tentar garantir canal mesmo em caso de erro lógico
      try {
        const ensureFn = httpsCallable(functions, 'v4_setupCommunityChannel')
        await ensureFn({ communityId: id, communityName: community.name, imageUrl: community.imageUrl || null })
      } catch {
        // ignore ensure failure
      }
    } finally {
      setJoining(false)
    }
  }

  const openChat = async () => {
    if (!chatClient) {
      toast('Chat não disponível', { icon: '⚠️' });
      return;
    }

    if (!isMember) {
      toast('Entra primeiro na comunidade', { icon: '👉' });
      return;
    }

    setOpeningChat(true);
    try {
      // Garante o canal e membership no backend com credenciais de servidor (Stream secret)
      const ensureFn = httpsCallable(functions, 'v4_setupCommunityChannel')
      let ensuredChannelId = `community-${id}`
      try {
        const res = await ensureFn({ communityId: id, communityName: community.name, imageUrl: community.imageUrl || null })
        // @ts-ignore - callable retorna data
        ensuredChannelId = (res?.data?.channelId) || ensuredChannelId
      } catch (err) {
        console.warn('ensureCommunityChannel falhou, tentando client-side watch mesmo assim:', err)
      }

      const ch = chatClient.channel('messaging', ensuredChannelId)
      await ch.watch()

      navigate('/chat', { state: { channelId: ensuredChannelId } })
    } catch (e) {
      console.error('Erro ao abrir chat:', e)
      const msg = String(e?.message || '')
      if (msg.includes('is not allowed to perform action') || msg.includes('403')) {
        toast.error('Sem permissão para ler o canal. Aguarde alguns segundos e tente novamente.')
      } else {
        toast.error('Não foi possível abrir o chat')
      }
    } finally {
      setOpeningChat(false)
    }
  };



  if (!community) {

    return (

      <div className="flex items-center justify-center h-screen pb-24">

        <div className="text-center">

          <Loader className="animate-spin mx-auto mb-4 text-green-600" size={32} />

          <p className="text-gray-600">Carregando comunidade...</p>

        </div>

      </div>

    )

  }



  return (

    <>
      <div className="min-h-screen bg-gray-50 pt-14">
        <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 md:px-6">

          <div className="bg-white p-4 flex items-center gap-3 border-b">

            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">

              <ChevronLeft />

            </button>

            <h1 className="text-xl font-bold flex-1">{community.name}</h1>

            {community.createdBy === user?.uid && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Configurações"
              >
                <Settings size={20} />
              </button>
            )}

          </div>
        </div>



        <div className="p-4 space-y-4">

          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">

            <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center text-3xl">

              {community.imageUrl ? (

                <img src={community.imageUrl} className="w-full h-full object-cover" />

              ) : (

                <span>{community.emoji || '👥'}</span>

              )}

            </div>

            <div className="flex-1">

              {community.description && (

                <p className="text-sm text-gray-600 mb-2">{community.description}</p>

              )}

              <div className="flex items-center gap-3 text-xs text-gray-500">

                <div className="flex items-center gap-1">

                  <Users size={14} />

                  <span>{community.members?.length || 0}</span>

                </div>

                {community.category && <span className="text-purple-600">{community.category}</span>}

              </div>

              {/* Members Avatars */}

              {membersData.length > 0 && (

                <div className="flex -space-x-3 mt-3">

                  {membersData.slice(0, 6).map(m => (

                    <div
                      key={m.id}
                      title={m.name || m.displayName || 'Usuário'}
                      className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-green-100 flex items-center justify-center text-sm font-semibold cursor-pointer hover:scale-110 transition-transform"
                      onClick={() => navigate(`/profile/${m.id}`)}
                    >

                      {m.avatar || m.photoURL ? (

                        <img src={m.avatar || m.photoURL} className="w-full h-full object-cover" alt={m.name || m.displayName} />

                      ) : (

                        <span>{(m.name || m.displayName || 'U').charAt(0).toUpperCase()}</span>

                      )}

                    </div>

                  ))}

                  {membersData.length > 6 && (

                    <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700">

                      +{membersData.length - 6}

                    </div>

                  )}

                </div>

              )}

            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide whitespace-nowrap w-full md:w-auto">

              <button

                onClick={toggleMembership}

                disabled={joining}

                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${isMember ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}

              >

                {joining ? '...' : isMember ? 'Sair' : 'Pedir para entrar'}

              </button>

              {(community?.createdBy === user?.uid || community?.roles?.[user?.uid] === 'owner' || community?.roles?.[user?.uid] === 'mod') && (
                <>
                  <button
                    onClick={() => setShowManageRequests(true)}
                    className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700"
                    title="Gerir pedidos de entrada"
                  >
                    <span className="inline-flex items-center gap-1"><Shield size={14} /> Pedidos</span>
                  </button>
                  <button
                    onClick={() => setShowManageMembers(true)}
                    className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                    title="Gerir membros e promover moderadores"
                  >
                    <span className="inline-flex items-center gap-1"><Users size={14} /> Membros</span>
                  </button>
                </>
              )}

              <button

                onClick={openChat}

                disabled={chatLoading || openingChat}

                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"

              >

                <div className="flex items-center gap-2">

                  <MessageCircle size={16} />

                  <span>{openingChat ? 'Abrindo...' : 'Chat'}</span>

                </div>

              </button>

            </div>

          </div>

          {/* Regras da comunidade (guidelines) */}
          {showGuidelines && community.guidelines && (
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
              <h3 className="font-semibold mb-2 text-sm">Regras da comunidade</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{community.guidelines}</p>
              <div className="mt-3 text-right">
                <button
                  onClick={() => {
                    const key = `guidelinesSeen:${community.id}:${user.uid}`
                    localStorage.setItem(key, '1')
                    setShowGuidelines(false)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                >
                  Ok, entendi
                </button>
              </div>
            </div>
          )}



          {/* Criar publicação */}
          {isMember && (<form onSubmit={createCommunityStory} className="bg-white rounded-xl p-4 shadow-sm">

            <h3 className="font-semibold mb-3 text-sm">Nova publicação</h3>

            <textarea

              value={storyContent}

              onChange={(e) => setStoryContent(e.target.value)}

              placeholder="Partilha algo com a comunidade..."

              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-3 resize-none"

              rows={3}

              disabled={creatingStory}

            />

            {storyImagePreview && (

              <div className="relative mb-3">

                <img src={storyImagePreview} className="w-full max-h-72 object-contain rounded-xl bg-gray-100" />

                <button

                  type="button"

                  onClick={() => { setStoryImagePreview(null); setStoryImageFile(null) }}

                  className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full"

                >

                  ×

                </button>

              </div>

            )}

            <div className="flex items-center justify-between">

              <label className="text-xs flex items-center gap-1 cursor-pointer px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">

                <ImageIcon size={16} /> Imagem

                <input type="file" accept="image/*" onChange={handleStoryImageChange} className="hidden" />

              </label>

              <button

                type="submit"

                disabled={creatingStory || (!storyContent.trim() && !storyImageFile)}

                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"

              >

                {creatingStory ? 'Publicando...' : 'Publicar'}

                <Send size={14} />

              </button>

            </div>
          </form>
          )}

          {/* Feed da comunidade */}
          <div className="bg-white rounded-xl p-4 shadow-sm">

            <h3 className="font-semibold mb-4 text-sm">Publicações</h3>

            {pinnedStory && (
              <div className="border rounded-xl p-3 mb-4 bg-yellow-50 relative">
                <span className="absolute -top-2 left-3 bg-yellow-400 text-white text-[10px] px-2 py-0.5 rounded-full">Fixado</span>
                {isOwnerOrMod && (
                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'communities', id), { pinnedStoryId: deleteField() })
                        toast.success('Publicação desafixada')
                      } catch (e) { console.error(e); toast.error('Erro ao desafixar') }
                    }}
                    className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  >
                    Desafixar
                  </button>
                )}
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                    {pinnedStory.authorAvatar ? (
                      <img src={pinnedStory.authorAvatar} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-green-700">{pinnedStory.authorName?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{pinnedStory.authorName}</p>
                    {pinnedStory.timestamp?.toDate && (
                      <p className="text-[10px] text-gray-400">{pinnedStory.timestamp.toDate().toLocaleString('pt-PT')}</p>
                    )}
                  </div>
                </div>
                {pinnedStory.content && <p className="text-sm text-gray-800 mb-2 whitespace-pre-line">{pinnedStory.content}</p>}
                {pinnedStory.imageUrl && (
                  <img src={pinnedStory.imageUrl} className="w-full max-h-80 object-contain rounded-lg bg-gray-100" />
                )}
              </div>
            )}

            {loadingStories ? (

              <div className="text-center py-6 text-gray-400 text-sm">Carregando...</div>

            ) : stories.length === 0 ? (

              <div className="text-center py-6 text-gray-400 text-sm">Ainda sem publicações.</div>

            ) : (

              <div className="space-y-4">

                {stories.map(story => (

                  <div key={story.id} className="border rounded-xl p-3">

                    <div className="flex items-start gap-3 mb-2">

                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">

                        {story.authorAvatar ? (

                          <img src={story.authorAvatar} className="w-full h-full object-cover" />

                        ) : (

                          <span className="text-sm font-semibold text-green-700">{story.authorName?.charAt(0) || 'U'}</span>

                        )}

                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="text-xs font-semibold text-gray-700 truncate">{story.authorName}</p>

                        {story.timestamp?.toDate && (

                          <p className="text-[10px] text-gray-400">{story.timestamp.toDate().toLocaleString('pt-PT')}</p>

                        )}

                      </div>

                    </div>

                    {story.content && <p className="text-sm text-gray-800 mb-2 whitespace-pre-line">{story.content}</p>}

                    {story.imageUrl && (

                      <img src={story.imageUrl} className="w-full max-h-80 object-contain rounded-lg bg-gray-100" />

                    )}

                  </div>

                ))}

              </div>

            )}

          </div>
        </div>

      </div>

      <EditCommunityModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        community={community}
      />
      <ManageJoinRequestsModal
        communityId={id}
        isOpen={showManageRequests}
        onClose={() => setShowManageRequests(false)}
      />
      <ManageMembersModal
        community={{ ...community, id }}
        isOpen={showManageMembers}
        onClose={() => setShowManageMembers(false)}
      />
    </>

  )

}
