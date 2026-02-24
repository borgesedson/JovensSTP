import { X, MapPin, Clock, DollarSign, Briefcase, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../hooks/useAuth'
import { db } from '../services/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { ensureArray } from '../utils/formatters'

const JOB_TYPE_LABELS = {
  'estagio': 'Estágio',
  'tempo-integral': 'Tempo Integral',
  'remoto': 'Remoto',
  'meio-periodo': 'Meio Período'
}

const JOB_TYPE_COLORS = {
  'estagio': 'bg-blue-100 text-blue-700',
  'tempo-integral': 'bg-green-100 text-green-700',
  'remoto': 'bg-purple-100 text-purple-700',
  'meio-periodo': 'bg-yellow-100 text-yellow-700'
}

export const JobDetailsModal = ({ job, isOpen, onClose, onViewCandidates }) => {
  const { user, userType } = useAuth()
  const navigate = useNavigate()
  const [applied, setApplied] = useState(job.applicants?.includes(user?.uid) || false)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleApply = async () => {
    if (!user) {
      toast.error('Faça login para se candidatar!')
      return
    }

    if (userType !== 'young') {
      toast.error('Apenas jovens podem se candidatar!')
      return
    }

    setLoading(true)
    try {
      const jobRef = doc(db, 'jobs', job.id)
      
      if (applied) {
        await updateDoc(jobRef, {
          applicants: arrayRemove(user.uid)
        })
        setApplied(false)
        toast.success('Candidatura removida')
      } else {
        await updateDoc(jobRef, {
          applicants: arrayUnion(user.uid)
        })
        setApplied(true)
        toast.success('Candidatura enviada! 🎉')
      }
    } catch (error) {
      console.error('Erro ao candidatar:', error)
      toast.error('Erro ao processar candidatura')
    } finally {
      setLoading(false)
    }
  }

  const timeAgo = job.createdAt
    ? formatDistanceToNow(job.createdAt.toDate(), {
        addSuffix: true,
        locale: ptBR
      })
    : 'recente'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose?.()
      }}
    >
      <div
        className="bg-white w-full md:max-w-2xl md:rounded-2xl flex flex-col max-h-screen md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Detalhes da Vaga</h2>
          <button onClick={(e) => { e.stopPropagation(); onClose?.() }} className="p-1.5 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Company Header */}
          <div className="flex items-start gap-4">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.companyName}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                {job.companyName?.substring(0, 2).toUpperCase() || 'TS'}
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-bold text-xl text-gray-900 mb-1">{job.title}</h3>
              <button
                onClick={() => {
                  navigate(`/profile/${job.companyId}`)
                  onClose()
                }}
                className="text-green-600 hover:text-green-700 font-medium text-sm hover:underline"
              >
                {job.companyName}
              </button>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {job.location || 'São Tomé e Príncipe'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {timeAgo}
                </span>
              </div>
              <div className="mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${JOB_TYPE_COLORS[job.type] || 'bg-gray-100 text-gray-700'}`}>
                  {JOB_TYPE_LABELS[job.type] || job.type}
                </span>
              </div>
            </div>
            {/* Status (owner only) */}
            {userType === 'company' && user?.uid === job.companyId && job.status && (
              <div className="ml-2">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                  job.status === 'open'
                    ? 'bg-green-100 text-green-700'
                    : job.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {job.status === 'open' ? 'Aberta' : job.status === 'paused' ? 'Pausada' : 'Arquivada'}
                </span>
              </div>
            )}
          </div>

          {/* Salary */}
          {job.salary && (
            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign size={20} className="text-green-600" />
              <span className="font-semibold">{job.salary}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Briefcase size={18} className="text-green-600" />
              Descrição
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {job.description || 'Sem descrição disponível.'}
            </p>
          </div>

          {/* Requirements */}
          {(() => {
            const requirements = ensureArray(job.requirements);
            return requirements.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600" />
                  Requisitos
                </h4>
                <ul className="space-y-2">
                  {requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Applicants count (for company) */}
          {userType === 'company' && user?.uid === job.companyId && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">{job.applicants?.length || 0}</span> candidatos
              </p>
            </div>
          )}

          {/* Already applied indicator */}
          {applied && userType === 'young' && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-900 flex items-center gap-2">
                <CheckCircle size={16} />
                Já te candidataste a esta vaga
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0">
          {userType === 'young' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleApply() }}
              disabled={loading || (job.status && job.status !== 'open')}
              className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
                (job.status && job.status !== 'open')
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : applied
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading
                ? 'Processando...'
                : (job.status && job.status !== 'open')
                ? (job.status === 'paused' ? 'Vaga Pausada' : 'Vaga Arquivada')
                : applied
                ? 'Remover Candidatura'
                : 'Candidatar-me'}
            </button>
          )}
          {userType === 'company' && user?.uid === job.companyId && (
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onClose?.() }}
                className="flex-1 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Fechar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewCandidates?.()
                }}
                className="flex-1 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Ver Candidatos ({job.applicants?.length || 0})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
