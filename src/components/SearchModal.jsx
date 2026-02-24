import { useState, useEffect } from 'react'
import { X, Search, User, Briefcase, Users } from 'lucide-react'
import { db } from '../services/firebase'
import { collection, query, getDocs, limit } from 'firebase/firestore'
import { useNavigate, useLocation } from 'react-router-dom'

export const SearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState({ users: [], jobs: [], communities: [] })
  const [loading, setLoading] = useState(false)

  // Detectar contexto baseado na rota atual
  const getSearchContext = () => {
    const path = location.pathname
    if (path.includes('/jobs')) return 'jobs'
    if (path.includes('/communities')) return 'communities'
    if (path.includes('/profile') || path === '/') return 'people'
    return 'all' // busca geral
  }

  const searchContext = getSearchContext()

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults({ users: [], jobs: [], communities: [] })
      return
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true)
      try {
        let users = []
        let jobs = []
        let communities = []

        // Buscar baseado no contexto
        if (searchContext === 'all' || searchContext === 'people') {
          const usersRef = collection(db, 'users')
          const usersSnapshot = await getDocs(usersRef)
          users = usersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => {
              const term = searchTerm.toLowerCase();
              return (
                user.displayName?.toLowerCase().includes(term) ||
                user.company?.toLowerCase().includes(term) ||
                user.bio?.toLowerCase().includes(term) ||
                user.name?.toLowerCase().includes(term) ||
                user.email?.toLowerCase().includes(term)
              );
            })
        }

        if (searchContext === 'all' || searchContext === 'jobs') {
          const jobsRef = collection(db, 'jobs')
          const jobsQuery = query(jobsRef, limit(10))
          const jobsSnapshot = await getDocs(jobsQuery)
          jobs = jobsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(job => 
              job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              job.location?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (searchContext === 'all' || searchContext === 'communities') {
          const communitiesRef = collection(db, 'communities')
          const communitiesQuery = query(communitiesRef, limit(15))
          const communitiesSnap = await getDocs(communitiesQuery)
          communities = communitiesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data(), membersCount: doc.data().members?.length || 0 }))
            .filter(c =>
              c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.description?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        setResults({ users, jobs, communities })
      } catch (error) {
        console.error('Erro na busca:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [searchTerm, searchContext])

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`)
    onClose()
  }

  const handleJobClick = () => {
    navigate('/jobs')
    onClose()
  }

  const handleCommunityClick = (id) => {
    navigate(`/communities/${id}`)
    onClose()
  }

  // Título e placeholder dinâmico baseado no contexto
  const getPlaceholder = () => {
    switch (searchContext) {
      case 'jobs':
        return 'Buscar vagas, empresas...'
      case 'communities':
        return 'Buscar comunidades...'
      case 'people':
        return 'Buscar pessoas...'
      default:
        return 'Buscar pessoas, vagas, comunidades...'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="text-gray-400" size={22} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={getPlaceholder()}
            className="flex-1 outline-none text-base"
            autoFocus
          />
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {!searchTerm.trim() ? (
            <div className="text-center py-12 text-gray-400">
              <Search size={48} className="mx-auto mb-3 opacity-30" />
              <p>Começa a digitar para buscar</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-gray-500">
              Buscando...
            </div>
          ) : results.users.length === 0 && results.jobs.length === 0 && results.communities.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>Nenhum resultado encontrado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Users */}
              {results.users.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                    <User size={16} />
                    Pessoas
                  </h3>
                  <div className="space-y-2">
                    {results.users.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition"
                      >
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                            {(user.displayName || user.company || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900">
                            {user.type === 'company' ? (user.company || user.displayName) : user.displayName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {user.type === 'company' ? 'Empresa' : (user.bio ? user.bio.substring(0, 60) + (user.bio.length > 60 ? '...' : '') : user.location)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Jobs */}
              {results.jobs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                    <Briefcase size={16} />
                    Vagas
                  </h3>
                  <div className="space-y-2">
                    {results.jobs.map(job => (
                      <button
                        key={job.id}
                        onClick={() => handleJobClick()}
                        className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-left"
                      >
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="text-green-600" size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{job.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{job.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                              {job.type}
                            </span>
                            {job.location && (
                              <span className="text-xs text-gray-500">📍 {job.location}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Communities */}
              {results.communities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                    <Users size={16} />
                    Comunidades
                  </h3>
                  <div className="space-y-2">
                    {results.communities
                      .sort((a,b) => (b.membersCount||0) - (a.membersCount||0))
                      .map(community => (
                      <button
                        key={community.id}
                        onClick={() => handleCommunityClick(community.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition"
                      >
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {community.imageUrl ? (
                            <img src={community.imageUrl} alt={community.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">{community.emoji || '👥'}</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900">{community.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{community.membersCount || (community.members?.length || 0)} membros</span>
                            {community.category && (
                              <>
                                <span>•</span>
                                <span className="text-purple-600">{community.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
