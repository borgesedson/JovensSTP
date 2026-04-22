import { Heart, MessageCircle, Trash2, Share2, Star, ExternalLink, Edit2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { doc, deleteDoc, arrayRemove, updateDoc, arrayUnion, collection, onSnapshot, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { EditPostModal } from './EditPostModal'

import { CommentsSection } from './CommentsSection'
import MediaViewerModal from './MediaViewerModal'
import { AmbassadorBadge } from './AmbassadorBadge'

// Extrai YouTube video ID de uma URL
const extractYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Detecta URLs em texto
const detectLinks = (text) => {
  const urlPattern = /(https?:\/\/[^\s]+)/g
  return text.match(urlPattern) || []
}

// Renderiza texto com links clicáveis
const renderTextWithLinks = (text) => {
  const urlPattern = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlPattern)
  
  return parts.map((part, i) => {
    if (part.match(urlPattern)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:text-green-700 underline inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {part.length > 50 ? part.slice(0, 50) + '...' : part}
          <ExternalLink size={14} />
        </a>
      )
    }
    return part
  })
}


export const PostCard = ({ post, onDelete, onEdit }) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [likes, setLikes] = useState(post.likes || [])
  const [liked, setLiked] = useState(likes.includes(user?.uid))
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [previewComments, setPreviewComments] = useState([])
  const [youtubeVideoId, setYoutubeVideoId] = useState(null)
  const [otherLinks, setOtherLinks] = useState([])
  // Estado para modal de mídia
  const [mediaModal, setMediaModal] = useState({ open: false, src: '', type: 'image' })
  // Estado para repost
  const [originalPost, setOriginalPost] = useState(null)
  // Ambassador status do autor
  const [authorIsAmbassador, setAuthorIsAmbassador] = useState(false)

  // Buscar status de embaixador do autor
  useEffect(() => {
    if (!post?.authorId) return
    const fetchAmbassador = async () => {
      try {
        const { getDoc } = await import('firebase/firestore')
        const snap = await getDoc(doc(db, 'users', post.authorId))
        if (snap.exists() && snap.data().isAmbassador) {
          setAuthorIsAmbassador(true)
        }
      } catch { /* ignore */ }
    }
    fetchAmbassador()
  }, [post?.authorId])

  // Buscar dados do post original se for repost
  useEffect(() => {
    if (post.repostOf) {
      const fetchOriginal = async () => {
        try {
          const ref = doc(db, 'stories', post.repostOf)
          const snap = await getDocs(query(collection(db, 'stories'), orderBy('timestamp', 'desc')))
          // Busca apenas o post original
          const original = snap.docs.find(d => d.id === post.repostOf)
          if (original) setOriginalPost({ id: original.id, ...original.data() })
        } catch (e) {
          setOriginalPost(null)
        }
      }
      fetchOriginal()
    } else {
      setOriginalPost(null)
    }
  }, [post.repostOf])

  // Detecta links no conteúdo
  useEffect(() => {
    if (!post?.content) return
    
    const links = detectLinks(post.content)
    if (links.length === 0) return
    
    // Procura por YouTube
    for (const link of links) {
      const videoId = extractYouTubeId(link)
      if (videoId) {
        setYoutubeVideoId(videoId)
        // Remove YouTube link dos outros links
        setOtherLinks(links.filter(l => l !== link))
        return
      }
    }
    
    setOtherLinks(links)
  }, [post?.content])

  // Listen to comment count in real-time
  useEffect(() => {
    if (!post?.id) return

    const commentsRef = collection(db, 'stories', post.id, 'comments')
    const unsubscribe = onSnapshot(commentsRef, (snapshot) => {
      setCommentCount(snapshot.size)
    })

    return () => unsubscribe()
  }, [post?.id])

  // Load recent comments preview (2-3)
  useEffect(() => {
    if (!post?.id) return
    const commentsRef = collection(db, 'stories', post.id, 'comments')
    const q = query(commentsRef, orderBy('timestamp', 'desc'), limit(3))
    getDocs(q).then((snap) => {
      const cs = snap.docs.map(d => d.data())
      setPreviewComments(cs)
    }).catch(() => { /* ignore */ })
  }, [post?.id])

  const handleLike = async () => {
    try {
      const postRef = doc(db, 'stories', post.id)
      
      if (liked) {
        // Unlike
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        })
        setLikes(likes.filter(uid => uid !== user.uid))
        setLiked(false)
      } else {
        // Like
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        })
        const updatedLikes = [...likes, user.uid]
        setLikes(updatedLikes)
        setLiked(true)

        // Criar notificação para o autor do post (se não for você mesmo)
        if (post.authorId !== user.uid) {
          const notifRef = collection(db, 'notifications', post.authorId, 'items')
          await addDoc(notifRef, {
            type: 'like',
            message: `${user.displayName} curtiu a tua publicação`,
            link: '/',
            read: false,
            timestamp: new Date()
          })
        }
      }
    } catch (error) {
      console.error('Erro ao dar like:', error)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que quer deletar este post?')) {
      try {
        await deleteDoc(doc(db, 'stories', post.id))
        onDelete?.()
      } catch (error) {
        console.error('Erro ao deletar post:', error)
      }
    }
  }

  const timeAgo = post.timestamp
    ? formatDistanceToNow(post.timestamp.toDate(), { 
        addSuffix: true,
        locale: ptBR 
      })
    : 'agora'

  return (
    <div className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
      {/* Header do Post */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1 w-full">
          {/* Se for repost, mostra referência ao autor original */}
          {originalPost && (
            <div className="text-xs text-gray-500 mb-1">
              Repost de{' '}
              <span
                className="text-green-700 font-semibold cursor-pointer hover:underline"
                onClick={() => navigate(`/profile/${originalPost.authorId}`)}
              >
                {originalPost.authorName || 'Usuário'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
            onClick={() => navigate(`/profile/${post.authorId}`)}
          >
            {post.authorAvatar ? (
              <img 
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-11 h-11 rounded-full object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                {post.authorName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-gray-900 hover:text-green-600 transition">{post.authorName || 'Usuário'}</p>
                {authorIsAmbassador && <AmbassadorBadge size={15} />}
              </div>
              <p className="text-xs text-gray-500">{timeAgo}</p>
            </div>
          </div>
        </div>
        {(post.pinned || post.promoted) && (
          <div className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full">
            <Star size={14} /> Em destaque
          </div>
        )}
        
        {user?.uid === post.authorId && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowEditModal(true)}
              className="text-gray-400 hover:text-green-600 transition p-1.5 hover:bg-green-50 rounded-lg"
              title="Editar post"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-500 transition p-1.5 hover:bg-red-50 rounded-lg"
              title="Deletar post"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
            {/* Modal de edição do post */}
            <EditPostModal
              isOpen={showEditModal}
              initialContent={post.content}
              loading={editLoading}
              onCancel={() => setShowEditModal(false)}
              onSave={async (newContent) => {
                setEditLoading(true)
                try {
                  const postRef = doc(db, 'stories', post.id)
                  await updateDoc(postRef, { content: newContent })
                  setShowEditModal(false)
                  if (onEdit) onEdit(newContent)
                } catch (e) {
                  alert('Erro ao salvar edição!')
                } finally {
                  setEditLoading(false)
                }
              }}
            />
      </div>

      {/* Conteúdo do Post */}
      {post.content && (
        <div className="text-gray-800 mb-3 leading-relaxed whitespace-pre-wrap">
          {renderTextWithLinks(post.content)}
        </div>
      )}

      {/* YouTube Video Embed */}
      {youtubeVideoId && (
        <div className="mb-3 rounded-xl overflow-hidden bg-black aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}`}
            title="YouTube video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      {/* Imagem do Post (se houver) */}

      {post.imageUrl && (
        <div className="mb-3 rounded-xl overflow-hidden bg-gray-100 -mx-1 cursor-pointer group" onClick={() => setMediaModal({ open: true, src: post.imageUrl, type: 'image' })}>
          <img 
            src={post.imageUrl}
            alt="Post"
            className="w-full max-h-96 object-contain group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}

      {/* Vídeo do Post (se houver) */}
      {post.videoUrl && (
        <div className="mb-3 rounded-xl overflow-hidden bg-black cursor-pointer group" onClick={() => setMediaModal({ open: true, src: post.videoUrl, type: 'video' })}>
          <video 
            src={post.videoUrl}
            controls
            controlsList="nodownload"
            className="w-full max-h-[32rem] object-contain group-hover:scale-105 transition-transform duration-200"
            preload="metadata"
          />
        </div>
      )}

      {/* Comments preview */}
      {previewComments.length > 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 mb-2">
          <p className="text-xs text-gray-500 mb-1">Comentários populares</p>
          <div className="space-y-1">
            {previewComments.map((c, idx) => (
              <p key={idx} className="text-sm truncate"><span className="font-medium">{c.authorName}:</span> {c.text}</p>
            ))}
          </div>
        </div>
      )}

      {/* Footer com Ações */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            liked 
              ? 'text-red-500 bg-red-50' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-red-500'
          }`}
        >
          <Heart size={20} fill={liked ? 'currentColor' : 'none'} strokeWidth={2} />
          <span className="text-sm font-medium">{likes.length > 0 ? likes.length : ''}</span>
        </button>
        
        <button 
          onClick={() => setShowComments(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-green-600 transition"
        >
          <MessageCircle size={20} strokeWidth={2} />
          <span className="text-sm font-medium">{commentCount > 0 ? commentCount : ''}</span>
        </button>

        {/* Share */}
        <div className="relative group">
          <button
            onClick={async (event) => {
              // URL específico do post (pode ser usado para deep linking futuro)
              const postUrl = `${window.location.origin}/?post=${post.id}`
              const shareText = post.content?.slice(0, 140) || 'Publicação no JovensSTP'
              const shareTitle = `${post.authorName} no JovensSTP`
              // Tenta usar Web Share API (mobile)
              if (navigator.share) {
                try { 
                  await navigator.share({ 
                    title: shareTitle,
                    text: shareText,
                    url: postUrl 
                  })
                }
                catch (e) { 
                  // User cancelou ou falhou
                  console.debug('Share canceled or failed', e) 
                }
              } else {
                // Fallback: copia para clipboard
                try { 
                  await navigator.clipboard.writeText(postUrl)
                  // Feedback visual melhor
                  const button = event.currentTarget
                  const originalHTML = button.innerHTML
                  button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                  button.classList.add('text-green-600', 'bg-green-50')
                  setTimeout(() => {
                    button.innerHTML = originalHTML
                    button.classList.remove('text-green-600', 'bg-green-50')
                  }, 2000)
                }
                catch (e) { 
                  console.error('Failed to copy link', e)
                  alert('Não foi possível copiar o link')
                }
              }
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition"
          >
            <Share2 size={20} />
          </button>
          {/* Dropdown para repost */}
          <div className="absolute left-0 mt-2 z-10 hidden group-hover:block bg-white border border-gray-200 rounded shadow-lg min-w-[180px]">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
              onClick={async () => {
                // Cria um novo post no Firestore como repost e notifica o autor original
                try {
                  const repostData = {
                    author: user.displayName,
                    authorId: user.uid,
                    authorName: user.displayName,
                    avatar: user.avatar || '',
                    content: post.content,
                    imageUrl: post.imageUrl || '',
                    videoUrl: post.videoUrl || '',
                    timestamp: new Date(),
                    type: user.type || 'young',
                    repostOf: post.id,
                  }
                  await addDoc(collection(db, 'stories'), repostData)
                  // Notifica o autor original se não for você mesmo
                  if (post.authorId && post.authorId !== user.uid) {
                    const notifRef = collection(db, 'notifications', post.authorId, 'items')
                    await addDoc(notifRef, {
                      type: 'repost',
                      message: `${user.displayName} compartilhou sua publicação no próprio perfil!`,
                      link: `/profile/${user.uid}`,
                      read: false,
                      timestamp: new Date()
                    })
                  }
                  alert('Post compartilhado no seu perfil!')
                } catch (e) {
                  alert('Erro ao compartilhar: ' + (e?.message || e))
                }
              }}
            >
              Compartilhar no meu perfil
            </button>
          </div>
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsSection
        postId={post.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        commentCount={commentCount}
      />
      {/* Modal de mídia em tela cheia */}
      <MediaViewerModal
        isOpen={mediaModal.open}
        onClose={() => setMediaModal({ ...mediaModal, open: false })}
        src={mediaModal.src}
        type={mediaModal.type}
        alt={post.content?.slice(0, 80) || 'Mídia'}
      />
    </div>
  )
}
