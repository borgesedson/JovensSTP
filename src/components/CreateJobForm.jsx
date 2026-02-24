import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../services/firebase'
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore'
import { X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import AIWritingAssistant from './AIWritingAssistant'

export const CreateJobForm = ({ onClose, onJobCreated, job = null, mode = 'create' }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    type: job?.type || 'tempo-integral',
    location: job?.location || 'São Tomé e Príncipe',
    salary: job?.salary || '',
    duration: job?.duration || '',
    requirements: job?.requirements || [],
    status: job?.status || 'open', // open | paused | archived
  })
  const [currentRequirement, setCurrentRequirement] = useState('')

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const addRequirement = () => {
    if (currentRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, currentRequirement.trim()]
      }))
      setCurrentRequirement('')
    }
  }

  const removeRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.description) {
      toast.error('Preencha título e descrição!')
      return
    }

    setLoading(true)
    try {
      if (mode === 'edit' && job?.id) {
        const ref = doc(db, 'jobs', job.id)
        await updateDoc(ref, {
          ...formData,
          updatedAt: serverTimestamp(),
        })
        toast.success('Vaga atualizada!')
      } else {
        await addDoc(collection(db, 'jobs'), {
          ...formData,
          companyId: user.uid,
          companyName: user.displayName || 'Empresa',
          companyLogo: user.photoURL || null,
          createdAt: serverTimestamp(),
          applicants: []
        })
        toast.success('Vaga publicada! 🎉')
      }
      onJobCreated?.()
      onClose?.()
    } catch (error) {
      console.error('Erro ao salvar vaga:', error)
      toast.error('Erro ao salvar vaga')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-2xl font-bold">{mode === 'edit' ? 'Editar Vaga' : 'Publicar Nova Vaga'}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Título */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              Título da Vaga *
            </label>
            <AIWritingAssistant
              text={formData.title}
              onRefine={(refined) => setFormData(prev => ({ ...prev, title: refined }))}
              type="professional"
            />
          </div>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Ex: Desenvolvedor Frontend Júnior"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de Vaga *
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="tempo-integral">Tempo Integral</option>
            <option value="estagio">Estágio</option>
            <option value="remoto">Remoto</option>
            <option value="meio-periodo">Meio Período</option>
          </select>
        </div>

        {/* Status (somente no modo editar) */}
        {mode === 'edit' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="open">Aberta</option>
              <option value="paused">Pausada</option>
              <option value="archived">Arquivada</option>
            </select>
          </div>
        )}

        {/* Localização */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Localização
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Ex: São Tomé, Príncipe"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Salário e Duração */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Salário
            </label>
            <input
              type="text"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              placeholder="Ex: 5.000 - 8.000 Db"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Duração
            </label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              placeholder="Ex: 6 meses"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              Descrição *
            </label>
            <AIWritingAssistant
              text={formData.description}
              onRefine={(refined) => setFormData(prev => ({ ...prev, description: refined }))}
              type="professional"
            />
          </div>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descreva a vaga, responsabilidades, benefícios..."
            rows="5"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Requisitos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Requisitos
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentRequirement}
              onChange={(e) => setCurrentRequirement(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              placeholder="Ex: React, TypeScript"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="button"
              onClick={addRequirement}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Lista de Requisitos */}
          {formData.requirements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.requirements.map((req, index) => (
                <span
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {req}
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? (mode === 'edit' ? 'Salvando...' : 'Publicando...') : (mode === 'edit' ? 'Salvar Alterações' : 'Publicar Vaga')}
          </button>
        </div>
      </form>
    </div>
  )
}
