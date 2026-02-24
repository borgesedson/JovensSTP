import { useState } from 'react'
import { X, Image as ImageIcon, Sparkles } from 'lucide-react'
import { app, db, functions } from '../services/firebase'
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { uploadUserAvatar } from '../services/storage'
import toast from 'react-hot-toast'
import AIWritingAssistant from './AIWritingAssistant'

const CATEGORIES = [
  'Tecnologia',
  'Negócios',
  'Educação',
  'Design',
  'Marketing',
  'Finanças',
  'Saúde',
  'Turismo',
  'Agricultura'
]

const EMOJIS = ['👥', '🚀', '💻', '🎨', '📚', '💼', '🌱', '✈️', '💡', '🏥', '🧠', '📈']

export const CreateCommunityModal = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Tecnologia')
  const [emoji, setEmoji] = useState('👥')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setName('')
    setDescription('')
    setCategory('Tecnologia')
    setEmoji('👥')
    setImageFile(null)
    setImagePreview(null)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 4MB)')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setLoading(true)
    try {
      // Criar documento base
      const docRef = await addDoc(collection(db, 'communities'), {
        name: name.trim(),
        description: description.trim(),
        category,
        emoji: imageFile ? null : emoji, // se imagem for usada, ignorar emoji
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        requiresApproval: true, // Sempre exige aprovação para entrada
        roles: { [user.uid]: 'owner' } // Definir criador como owner
      })

      // Upload de imagem se existir
      if (imageFile) {
        const imageUrl = await uploadUserAvatar(`communities/${docRef.id}-${Date.now()}`, imageFile)
        await updateDoc(doc(db, 'communities', docRef.id), { imageUrl })
      }

      // Garantir canal via função backend (evita problemas de permissão)
      try {
        const ensureFn = httpsCallable(functions, 'v4_setupCommunityChannel')
        await ensureFn({ communityId: docRef.id, communityName: name.trim(), imageUrl: null })
      } catch (e) {
        console.warn('Não foi possível assegurar canal agora:', e?.message)
      }

      toast.success('Comunidade criada! 🎉')
      reset()
      onClose()
      navigate(`/communities/${docRef.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao criar comunidade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-slide-up max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles size={18} className="text-green-600" />Nova Comunidade</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Nome */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Devs STP"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
              maxLength={50}
            />
          </div>

          {/* Descrição */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 block">Descrição</label>
              <AIWritingAssistant
                text={description}
                onRefine={(refined) => setDescription(refined)}
                type="community"
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sobre o que é esta comunidade?"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              maxLength={200}
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">{description.length}/200</p>
          </div>

          {/* Categoria & Emoji */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            {!imageFile && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl border text-lg transition ${emoji === em ? 'bg-green-100 border-green-500' : 'bg-gray-50 hover:bg-gray-100 border-gray-300'}`}
                      disabled={loading}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Imagem */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Imagem (opcional)</label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full max-h-60 object-contain rounded-xl bg-gray-100" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageFile(null); }}
                  className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-10 cursor-pointer hover:border-green-500 hover:bg-green-50 transition">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <ImageIcon size={32} className="text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Adicionar imagem</span>
                <span className="text-xs text-gray-400">PNG ou JPG até 4MB</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={loading} />
              </label>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t bg-white flex-shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Criando...' : 'Criar Comunidade'}
          </button>
        </div>
      </div>
    </div>
  )
}
