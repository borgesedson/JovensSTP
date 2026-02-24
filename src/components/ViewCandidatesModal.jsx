import { useState, useEffect } from 'react'
import { X, Mail, MapPin, GraduationCap, ExternalLink } from 'lucide-react'
import { db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'

export const ViewCandidatesModal = ({ job, isOpen, onClose }) => {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCandidates = async () => {
      if (!isOpen || !job?.applicants?.length) {
        setCandidates([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Fetch user profiles for all applicants
        const candidatePromises = job.applicants.map(async (uid) => {
          const userRef = doc(db, 'users', uid)
          const userSnap = await getDoc(userRef)
          if (userSnap.exists()) {
            return { uid, ...userSnap.data() }
          }
          return null
        })

        const candidateData = await Promise.all(candidatePromises)
        setCandidates(candidateData.filter(Boolean))
      } catch (error) {
        console.error('Erro ao carregar candidatos:', error)
        toast.error('Erro ao carregar candidatos')
      } finally {
        setLoading(false)
      }
    }

    fetchCandidates()
  }, [isOpen, job])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-bold">Candidatos</h2>
            <p className="text-sm text-gray-600">{job?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando candidatos...
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum candidato ainda
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div
                  key={candidate.uid}
                  className="bg-gray-50 p-4 rounded-lg hover:shadow-md transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {candidate.photoURL ? (
                      <img
                        src={candidate.photoURL}
                        alt={candidate.displayName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center text-2xl font-bold">
                        {candidate.displayName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{candidate.displayName}</h3>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Mail size={14} />
                        <a href={`mailto:${candidate.email}`} className="hover:text-green-600">
                          {candidate.email}
                        </a>
                      </div>

                      {candidate.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <MapPin size={14} />
                          <span>{candidate.location}</span>
                        </div>
                      )}

                      {candidate.education && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <GraduationCap size={14} />
                          <span>
                            {typeof candidate.education === 'object' 
                              ? `${candidate.education.degree || 'Curso'} - ${candidate.education.institution || 'Instituição'} (${candidate.education.startYear || ''}-${candidate.education.endYear || 'atual'})`
                              : candidate.education
                            }
                          </span>
                        </div>
                      )}

                      {candidate.skills && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">
                            <strong>Habilidades:</strong> {candidate.skills}
                          </p>
                        </div>
                      )}

                      {candidate.bio && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{candidate.bio}"
                        </p>
                      )}

                      {/* Action Button */}
                      <div className="mt-3">
                        <a
                          href={`mailto:${candidate.email}?subject=Sobre a vaga: ${job?.title}`}
                          className="inline-flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                        >
                          <Mail size={16} />
                          Contactar
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            {candidates.length} {candidates.length === 1 ? 'candidato' : 'candidatos'}
          </p>
        </div>
      </div>
    </div>
  )
}
