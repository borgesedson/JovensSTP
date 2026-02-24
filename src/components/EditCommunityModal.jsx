import { useState, useEffect } from 'react'
import { X, Image as ImageIcon, Sparkles, Trash2 } from 'lucide-react'
import { db } from '../services/firebase'
import { updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { uploadUserAvatar } from '../services/storage'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const CATEGORIES = [
  'Tecnologia',
  'Negócios',
  'Educação',
  'Design',
  'Marketing',
  'Finanças',
  'Saúde',
  'Turismo',
  'Agricultura',
   'Pesca',

]

const EMOJIS = ['👥','🚀','💻','🎨','📚','💼','🌱','✈️','💡','🏥','🧠','📈']

export const EditCommunityModal = ({ isOpen, onClose, community }) => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Tecnologia')
  const [emoji, setEmoji] = useState('👥')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [guidelines, setGuidelines] = useState('')

  useEffect(() => {
    if (community) {
      setName(community.name || '')
      setDescription(community.description || '')
      setCategory(community.category || 'Tecnologia')
      setEmoji(community.emoji || '👥')
      setImagePreview(community.imageUrl || null)
      setGuidelines(community.guidelines || '')
    }
  }, [community])

  if (!isOpen) return null

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

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setLoading(true)
    try {
      const updates = {
        name: name.trim(),
        description: description.trim(),
        category,
        emoji: imageFile ? null : emoji,
        guidelines: guidelines.trim(),
      }

      if (imageFile) {
        const imageUrl = await uploadUserAvatar(`communities/${community.id}-${Date.now()}`, imageFile)
        updates.imageUrl = imageUrl
      }

      await updateDoc(doc(db, 'communities', community.id), updates)
      toast.success('Comunidade atualizada! ✅')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao atualizar')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteDoc(doc(db, 'communities', community.id))
      toast.success('Comunidade deletada')
      navigate('/communities')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao deletar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-green-600" />
            Editar Comunidade
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="text-red-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-center">Deletar comunidade?</h3>
            <p className="text-sm text-gray-600 text-center">
              Esta ação é permanente. Todos os posts e membros serão removidos.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
                disabled={loading}
              >
                {loading ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nome *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={loading}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                  maxLength={200}
                  disabled={loading}
                />
                <p className="text-xs text-gray-400 mt-1">{description.length}/200</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={loading}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                {!imageFile && !community?.imageUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Emoji</label>
                    <div className="flex flex-wrap gap-1">
                      {EMOJIS.slice(0, 6).map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setEmoji(em)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm ${emoji === em ? 'bg-green-100 border-green-500' : 'bg-gray-50 border-gray-300'}`}
                          disabled={loading}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Regras da comunidade (guidelines)</label>
                <textarea
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  placeholder="Escreve regras básicas e combinados (máx 500 caracteres)"
                  className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={4}
                  maxLength={500}
                  disabled={loading}
                />
                <p className="text-xs text-gray-400 mt-1">Mostrado aos membros ao entrar/visitar pela primeira vez.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Imagem</label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl bg-gray-100" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); setImageFile(null) }}
                      className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 border-2 border-dashed rounded-xl py-6 cursor-pointer hover:border-green-500">
                    <ImageIcon size={24} className="text-gray-400" />
                    <span className="text-xs text-gray-500">Adicionar imagem</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={loading} />
                  </label>
                )}
              </div>
            </form>

            <div className="p-5 border-t flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
                disabled={loading}
              >
                <Trash2 size={16} />
                Deletar
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading || !name.trim()}
                className="flex-1 bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
