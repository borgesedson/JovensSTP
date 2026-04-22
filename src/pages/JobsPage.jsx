import { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react'
import { db } from '../services/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { JobCard } from '../components/JobCard'
import { CreateJobForm } from '../components/CreateJobForm'
import { useAuth } from '../hooks/useAuth'
import { Loader, Plus, Briefcase } from 'lucide-react'

const FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'estagio', label: 'Estágios' },
  { id: 'tempo-integral', label: 'Tempo Integral' },
  { id: 'remoto', label: 'Remoto' }
]

export const JobsPage = () => {
  const { user, userType } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('todas')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'mine'

  useEffect(() => {
    if (!user) return

    // Query base - buscar TODAS as vagas sempre
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'))

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setJobs(jobsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleJobCreated = () => {
    setShowCreateForm(false)
  }

  // Filter jobs based on search and tab (Otimizado com useMemo)
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Mostrar vagas pausadas/arquivadas nas abas "Minhas" tanto para empresa quanto para jovem (ver aplicações antigas)
      const isCompanyMine = userType === 'company' && activeTab === 'mine'
      const isYoungMine = userType === 'young' && activeTab === 'mine'
      if ((job.status === 'archived' || job.status === 'paused') && !(isCompanyMine || isYoungMine)) {
        return false
      }

      // Type filter (estágio, tempo-integral, remoto)
      if (activeFilter !== 'todas' && job.type !== activeFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const queryStr = searchQuery.toLowerCase()
        const matchesSearch = 
          job.title?.toLowerCase().includes(queryStr) ||
          job.companyName?.toLowerCase().includes(queryStr) ||
          job.description?.toLowerCase().includes(queryStr) ||
          job.location?.toLowerCase().includes(queryStr)
        if (!matchesSearch) return false
      }

      // Tab filter
      if (activeTab === 'mine') {
        if (userType === 'young') return job.applicants?.includes(user?.uid)
        if (userType === 'company') return job.companyId === user?.uid
      }

      return true
    })
  }, [jobs, searchQuery, activeFilter, activeTab, userType, user?.uid])

  return (
    <div className="bg-gray-50 min-h-screen pt-14">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 md:px-6">
      {/* Company management banner */}
      {userType === 'company' && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 text-green-900 px-4 py-3 text-sm">
          Gestão de Vagas: use as abas para ver "Todas" ou "Minhas Vagas". Controle status nas ações do card.
        </div>
      )}
      {/* Search Bar */}
      <div className="bg-white px-4 py-3 border-b">
        <input
          type="text"
          placeholder="Buscar vagas por título, empresa, localização..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
        />
      </div>

      {/* Tabs: All / Mine */}
      <div className="bg-white px-4 py-2 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 px-1 font-medium text-sm transition border-b-2 ${
              activeTab === 'all'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas as Vagas
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`pb-2 px-1 font-medium text-sm transition border-b-2 ${
              activeTab === 'mine'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {userType === 'young' ? 'Minhas Candidaturas' : 'Minhas Vagas'}
          </button>
        </div>
      </div>

      {/* Filtros Horizontais */}
      <div className="bg-white px-4 py-3 mb-2 sticky top-14 z-10 shadow-sm">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-5 py-2 rounded-full font-medium whitespace-nowrap transition text-sm ${
                activeFilter === filter.id
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Vagas */}
      <div className="px-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="animate-spin text-green-600" size={32} />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Briefcase className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500 mb-2">
              {searchQuery 
                ? 'Nenhuma vaga encontrada com essa busca'
                : activeTab === 'mine'
                ? userType === 'young'
                  ? 'Ainda não te candidataste a nenhuma vaga'
                  : 'Ainda não publicaste nenhuma vaga'
                : activeFilter === 'todas' 
                ? 'Nenhuma vaga disponível ainda'
                : `Nenhuma vaga de ${FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase()}`
              }
            </p>
            {userType === 'company' && activeTab === 'mine' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 text-green-600 hover:text-green-700 font-semibold"
              >
                Publica a tua primeira vaga! →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* FAB - Floating Action Button (só para empresas) */}
      {userType === 'company' && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition flex items-center justify-center z-40"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* Modal de Criar Vaga */}
      {showCreateForm && (
        <CreateJobForm
          onClose={() => setShowCreateForm(false)}
          onJobCreated={handleJobCreated}
        />
      )}
      </div>
    </div>
  )
}
