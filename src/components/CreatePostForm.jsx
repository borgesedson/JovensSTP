import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../services/firebase'
import { collection, addDoc, serverTimestamp, query, limit, getDocs, orderBy, where } from 'firebase/firestore'
import { Send, Image as ImageIcon, X, Video } from 'lucide-react'
import { uploadUserAvatar } from '../services/storage'
import toast from 'react-hot-toast'
import NotificationService from '../services/NotificationService'
import { Guardian } from '../utils/securityUtils'

export const CreatePostForm = ({ onPostCreated }) => {
  const { user, userType } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaType, setMediaType] = useState(null) // 'image' ou 'video'

  const handleMediaChange = (e, type) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validação de tamanho
      const maxSize = type === 'image' ? 5 * 1024 * 1024 : 200 * 1024 * 1024 // 5MB imagens, 200MB vídeos
      if (file.size > maxSize) {
        toast.error(`${type === 'image' ? 'Imagem' : 'Vídeo'} muito grande (máx ${type === 'image' ? '5MB' : '50MB'})`)
        return
      }

      setMediaFile(file)
      setMediaType(type)
      const reader = new FileReader()
      reader.onloadend = () => {
        setMediaPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!content.trim() && !mediaFile) {
      toast.error('Escreve algo ou adiciona uma foto/vídeo! 😊')
      return
    }

    // Guardian Security Check
    const checkContent = Guardian.validateText(content);
    if (!checkContent.clean) {
      toast.error('⚠️ Detetamos conteúdo impróprio no teu post! Por favor, mantém a comunidade focada na educação e apoio mútuo.');
      console.warn('[Guardian] Post blocked:', { content, found: checkContent.found });
      return;
    }

    setLoading(true)
    try {
      const postData = {
        authorId: user.uid,
        authorName: user.displayName || 'Usuário',
        content: content.trim(),
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
        type: userType || 'young',
      }

      // Upload da mídia para Firebase Storage se existir
      if (mediaFile) {
        const mediaUrl = await uploadUserAvatar(`posts/${user.uid}-${Date.now()}`, mediaFile)

        if (mediaType === 'image') {
          postData.imageUrl = mediaUrl
        } else if (mediaType === 'video') {
          postData.videoUrl = mediaUrl
        }
      }

      // Não salvar photoURL vazio
      if (user.photoURL) {
        postData.authorAvatar = user.photoURL
      }

      await addDoc(collection(db, 'stories'), postData)

      // Automation: Notify other users about the new story
      try {
        const usersSnap = await getDocs(query(
          collection(db, 'users'),
          orderBy('lastActive', 'desc'),
          limit(10)
        ))
        const recipientIds = usersSnap.docs
          .map(d => d.id)
          .filter(id => id !== user.uid)

        if (recipientIds.length > 0) {
          await NotificationService.notifyStoryCreated(recipientIds, content.trim() || 'Nova story publicada!')
        }
      } catch (notifyError) {
        console.error('⚠️ Notification automation failed:', notifyError)
      }

      toast.success('Post criado! 🎉')
      setContent('')
      setMediaPreview(null)
      setMediaFile(null)
      setMediaType(null)
      onPostCreated?.()
    } catch (error) {
      console.error('Erro ao criar post:', error)
      toast.error(`Erro ao criar post: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <form onSubmit={handleSubmit}>
        {/* Avatar + Input */}
        <div className="flex gap-3 mb-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="No que estás a pensar?"
            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
            rows="3"
            disabled={loading}
          />
        </div>

        {/* Media Preview */}
        {mediaPreview && (
          <div className="relative mb-3 rounded-xl overflow-hidden bg-gray-100">
            {mediaType === 'image' ? (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-full max-h-80 object-contain"
              />
            ) : (
              <video
                src={mediaPreview}
                controls
                className="w-full max-h-80"
              />
            )}
            <button
              type="button"
              onClick={() => {
                setMediaPreview(null)
                setMediaFile(null)
                setMediaType(null)
              }}
              className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/80 transition shadow-lg"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 cursor-pointer text-gray-600 hover:bg-green-50 hover:text-green-600 rounded-lg transition">
              <ImageIcon size={20} />
              <span className="text-sm font-medium">Foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleMediaChange(e, 'image')}
                className="hidden"
                disabled={loading}
              />
            </label>

            <label className="flex items-center gap-2 px-3 py-2 cursor-pointer text-gray-600 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition">
              <Video size={20} />
              <span className="text-sm font-medium">Vídeo</span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleMediaChange(e, 'video')}
                className="hidden"
                disabled={loading}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || (!content.trim() && !mediaFile)}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
          >
            {loading ? 'Publicando...' : 'Publicar'}
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
