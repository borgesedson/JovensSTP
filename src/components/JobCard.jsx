import { Briefcase, MapPin, Clock, DollarSign, Users, MoreVertical, Edit2, Pause, Play, Archive, Copy } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../hooks/useAuth'
import { db } from '../services/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection } from 'firebase/firestore'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ViewCandidatesModal } from './ViewCandidatesModal'
import { JobDetailsModal } from './JobDetailsModal'
import { CreateJobForm } from './CreateJobForm'

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

export const JobCard = ({ job }) => {
  const { user, userType } = useAuth()
  const [applied, setApplied] = useState(job.applicants?.includes(user?.uid) || false)
  const [applicantsCount, setApplicantsCount] = useState(job.applicants?.length || 0)
  const [loading, setLoading] = useState(false)
  const [showCandidatesModal, setShowCandidatesModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const isOwner = userType === 'company' && user?.uid === job.companyId

  // Debug: verificar userType
  console.log('JobCard - userType:', userType, 'user:', user?.uid)

  const handleApply = async () => {
    if (!user) {
      toast.error('Faça login para se candidatar!')
      return
    }

    if (userType !== 'young') {
      toast.error('Apenas jovens podem se candidatar!')
      return
    }

    if (job.status && job.status !== 'open') {
      toast.error('Vaga indisponível para candidatura no momento')
      return
    }

    setLoading(true)
    try {
      const jobRef = doc(db, 'jobs', job.id)
      
      if (applied) {
        // Remover candidatura
        await updateDoc(jobRef, {
          applicants: arrayRemove(user.uid)
        })
        setApplied(false)
        setApplicantsCount(prev => prev - 1)
        toast.success('Candidatura removida')
      } else {
        // Candidatar
        await updateDoc(jobRef, {
          applicants: arrayUnion(user.uid)
        })
        setApplied(true)
        setApplicantsCount(prev => prev + 1)
        toast.success('Candidatura enviada! 🎉')
      }
    } catch (error) {
      console.error('Erro ao candidatar:', error)
      const errorMessage = error.code === 'permission-denied' 
        ? 'Permissão negada. Tente fazer login novamente.'
        : 'Erro ao processar candidatura. Tente novamente.'
      toast.error(errorMessage)
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
    <>
    <div 
      onClick={() => setShowDetailsModal(true)}
      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Logo da Empresa */}
        {job.companyLogo ? (
          <img
            src={job.companyLogo}
            alt={job.companyName}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
            {job.companyName?.substring(0, 2).toUpperCase() || 'TS'}
          </div>
        )}

        {/* Título e Empresa */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-gray-900 mb-1">{job.title}</h3>
          <p className="text-gray-600 text-sm">{job.companyName}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {job.location || 'São Tomé e Príncipe'}
            </span>
            <span>•</span>
            <span className={`px-2 py-0.5 rounded-full ${JOB_TYPE_COLORS[job.type] || 'bg-gray-100 text-gray-700'}`}>
              {JOB_TYPE_LABELS[job.type] || job.type}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
        </div>

        {/* Status + Ações (empresa dona) */}
        {isOwner && (
          <div className="flex flex-col items-end gap-2 ml-2">
            {/* Status Badge */}
            {job.status && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                job.status === 'open'
                  ? 'bg-green-100 text-green-700'
                  : job.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {job.status === 'open' ? 'Aberta' : job.status === 'paused' ? 'Pausada' : 'Arquivada'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Descrição - escondida por padrão, pode expandir depois */}
      
      {/* Metadados compactos - não mostrar, já está no header */}

      {/* Footer com Ações */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        {/* Candidatar (young) */}
        {(userType === 'young') && (
          <button
            onClick={handleApply}
            disabled={loading || (job.status && job.status !== 'open')}
            className={`flex-1 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 text-sm ${
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
              ? 'Candidatura Enviada'
              : 'Candidatar'}
          </button>
        )}

        {/* Controles do dono da vaga */}
        {isOwner && (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => setShowCandidatesModal(true)}
              className="flex-1 py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition text-sm"
            >
              Ver Candidatos ({applicantsCount})
            </button>
            <button
              onClick={async () => {
                try {
                  const ref = doc(db, 'jobs', job.id)
                  const next = job.status === 'paused' ? 'open' : 'paused'
                  await updateDoc(ref, { status: next })
                  toast.success(next === 'open' ? 'Vaga reaberta' : 'Vaga pausada')
                } catch (e) {
                  console.error(e)
                  toast.error('Erro ao alterar status')
                }
              }}
              className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              title={job.status === 'paused' ? 'Retomar' : 'Pausar'}
            >
              {job.status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              onClick={async () => {
                try {
                  const ref = doc(db, 'jobs', job.id)
                  const next = job.status === 'archived' ? 'open' : 'archived'
                  await updateDoc(ref, { status: next })
                  toast.success(next === 'archived' ? 'Vaga arquivada' : 'Vaga reaberta')
                } catch (e) {
                  console.error(e)
                  toast.error('Erro ao arquivar/reabrir')
                }
              }}
              className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              title={job.status === 'archived' ? 'Reabrir' : 'Arquivar'}
            >
              <Archive size={18} />
            </button>
            <button
              onClick={async () => {
                try {
                  const payload = { ...job }
                  delete payload.id
                  payload.createdAt = undefined
                  payload.status = 'open'
                  await addDoc(collection(db, 'jobs'), {
                    ...payload,
                    createdAt: new Date(),
                    applicants: [],
                  })
                  toast.success('Vaga duplicada')
                } catch (e) {
                  console.error(e)
                  toast.error('Erro ao duplicar')
                }
              }}
              className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              title="Duplicar Vaga"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowEditForm(true) }}
              className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              title="Editar Vaga"
            >
              <Edit2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Modal de Candidatos */}
      <ViewCandidatesModal
        job={job}
        isOpen={showCandidatesModal}
        onClose={() => setShowCandidatesModal(false)}
      />
      
      {/* Modal de Detalhes */}
      <JobDetailsModal
        job={job}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onViewCandidates={() => {
          setShowDetailsModal(false)
          setShowCandidatesModal(true)
        }}
      />

      {/* Formulário de Edição */}
      {showEditForm && (
        <CreateJobForm
          job={job}
          mode="edit"
          onClose={() => setShowEditForm(false)}
          onJobCreated={() => {
            setShowEditForm(false)
            toast.success('Vaga atualizada com sucesso!')
          }}
        />
      )}
    </div>
    </>
  )
}
