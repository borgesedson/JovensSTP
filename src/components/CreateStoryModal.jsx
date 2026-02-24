import { useState } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { db } from '../services/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { uploadUserAvatar } from '../services/storage'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export const CreateStoryModal = ({ onClose, onStoryCreated }) => {
  const { user } = useAuth()
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande (máx 5MB)')
        return
      }
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!image) {
      toast.error('Adiciona uma imagem para o story')
      return
    }

    setLoading(true)
    try {
      // Upload image to Firebase Storage
      const imageUrl = await uploadUserAvatar(`stories/${user.uid}-${Date.now()}`, image)

      // Create story document
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
      
      await addDoc(collection(db, 'userStories'), {
        userId: user.uid,
        userName: user.displayName || 'Usuário',
        userAvatar: user.photoURL || null,
        imageUrl,
        createdAt: now,
        expiresAt: expiresAt,
        views: []
      })

      toast.success('Story publicado! 🎉')
      onStoryCreated?.()
      onClose()
    } catch (error) {
      console.error('Erro ao criar story:', error)
      toast.error('Erro ao publicar story')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Container */}
      <div 
        className="bg-white rounded-2xl w-full sm:max-w-md shadow-2xl" 
        style={{ 
          maxHeight: '90vh',
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Adicionar Story</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Image Preview or Upload */}
          {imagePreview ? (
            <div className="relative mb-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full object-contain rounded-xl bg-gray-100"
                style={{ maxHeight: '35vh' }}
              />
              <button
                type="button"
                onClick={() => {
                  setImage(null)
                  setImagePreview(null)
                }}
                className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg"
              >
                <X size={16} className="text-gray-700" />
              </button>
            </div>
          ) : (
            <label className="block cursor-pointer mb-3">
              <div className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <ImageIcon className="text-green-600" size={28} />
                </div>
                <p className="text-gray-700 font-medium">Adicionar foto</p>
                <p className="text-gray-400 text-sm">Toca para escolher</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              💡 O teu story ficará visível por 24 horas
            </p>
          </div>
        </div>

        {/* Button FIXO */}
        <div className="p-4 border-t flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !image}
            className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold disabled:opacity-50 shadow-lg"
          >
            {loading ? 'Publicando...' : 'Publicar Story'}
          </button>
        </div>
      </div>
    </div>
  )
}
