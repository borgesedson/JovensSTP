import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { searchTalents, saveTalentSearch } from '../services/matching';
import TalentCard from '../components/TalentCard';
import { Search, Filter, Save, Loader2, Users, X, Briefcase, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { JobCard } from '../components/JobCard';
import { CreateJobForm } from '../components/CreateJobForm';

const TalentsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [talents, setTalents] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [activeTab, setActiveTab] = useState('talents'); // talents | jobs

  const [filters, setFilters] = useState({
    skills: [],
    experienceLevel: 'todos',
    location: 'todos'
  });

  const [skillInput, setSkillInput] = useState('');
  
  // States para vagas
  const [allJobs, setAllJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobFilter, setJobFilter] = useState('all');
  const [jobSearch, setJobSearch] = useState('');

  const loadTalents = async (appliedFilters = filters) => {
    setSearching(true);
    try {
      const results = await searchTalents(appliedFilters, 1000);
      setTalents(results);
    } catch (error) {
      console.error('Erro ao buscar talentos:', error);
      toast.error('Erro ao buscar talentos');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTalents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load jobs
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'jobs'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllJobs(jobsData);
      setLoadingJobs(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !filters.skills.includes(skillInput.trim())) {
      const newFilters = {
        ...filters,
        skills: [...filters.skills, skillInput.trim()]
      };
      setFilters(newFilters);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFilters({
      ...filters,
      skills: filters.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleApplyFilters = () => {
    loadTalents(filters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      skills: [],
      experienceLevel: 'todos',
      location: 'todos'
    };
    setFilters(clearedFilters);
    loadTalents(clearedFilters);
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast.error('Introduz um nome para a busca');
      return;
    }

    const success = await saveTalentSearch(user.uid, searchName, filters);
    if (success) {
      toast.success('Busca guardada com sucesso!');
      setShowSaveModal(false);
      setSearchName('');
    } else {
      toast.error('Erro ao guardar busca');
    }
  };

  const activeFiltersCount = 
    filters.skills.length + 
    (filters.experienceLevel !== 'todos' ? 1 : 0) + 
    (filters.location !== 'todos' ? 1 : 0);

  // Filtrar vagas
  const getFilteredJobs = () => {
    let filtered = allJobs;

    // Mostrar apenas vagas da própria empresa
    if (user?.type === 'company') {
      filtered = filtered.filter(job => job.companyId === user.uid);
    }

    // Filtro por status (não mostrar arquivadas)
    filtered = filtered.filter(job => job.status !== 'archived' && job.status !== 'paused');

    // Filtro por tipo
    if (jobFilter !== 'all') {
      filtered = filtered.filter(job => job.type === jobFilter);
    }

    // Filtro por busca
    if (jobSearch.trim()) {
      const searchLower = jobSearch.toLowerCase();
      filtered = filtered.filter(job =>
        job.title?.toLowerCase().includes(searchLower) ||
        job.description?.toLowerCase().includes(searchLower) ||
        job.location?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredJobs = getFilteredJobs();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">A carregar talentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'talents' ? 'Talentos' : 'Minhas Vagas'}
              </h1>
            </div>

            {activeTab === 'talents' ? (
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Guardar busca"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            ) : (
              <button
                onClick={() => setShowCreateJob(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                title="Publicar vaga"
              >
                <Plus className="w-4 h-4" />
                Nova vaga
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('talents')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'talents'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Talentos ({talents.length})
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'jobs'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Minhas vagas ({allJobs.filter(j => j.companyId === user.uid).length})
            </button>
          </div>

          {/* Filter chips (apenas para talents) */}
          {activeTab === 'talents' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            {filters.skills.map((skill, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-800 text-sm rounded-lg"
              >
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:bg-indigo-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filters.experienceLevel !== 'todos' && (
              <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 text-sm rounded-lg">
                {filters.experienceLevel}
              </span>
            )}

            {filters.location !== 'todos' && (
              <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 text-sm rounded-lg">
                {filters.location}
              </span>
            )}

            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Limpar tudo
              </button>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Filters panel (apenas para talents) */}
      {activeTab === 'talents' && showFilters && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            {/* Skills filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <form onSubmit={handleAddSkill} className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Ex: React, Python, Design..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Adicionar
                </button>
              </form>
            </div>

            {/* Experience level filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nível de experiência
              </label>
              <select
                value={filters.experienceLevel}
                onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="todos">Todos os níveis</option>
                <option value="estagiario">Estagiário</option>
                <option value="junior">Júnior</option>
                <option value="pleno">Pleno</option>
                <option value="senior">Sénior</option>
              </select>
            </div>

            {/* Location filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Localização
              </label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="todos">Todas as localizações</option>
                <option value="remoto">Aberto a remoto</option>
                <option value="são tomé">São Tomé</option>
                <option value="príncipe">Príncipe</option>
              </select>
            </div>

            {/* Apply button */}
            <button
              onClick={handleApplyFilters}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Conteúdo da aba Vagas */}
        {activeTab === 'jobs' ? (
          <>
            {/* Filtros de vagas */}
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
              <div className="space-y-3">
                <input
                  type="text"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder="Procurar nas minhas vagas..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />

                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setJobFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      jobFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setJobFilter('estagio')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      jobFilter === 'estagio'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Estágios
                  </button>
                  <button
                    onClick={() => setJobFilter('tempo integral')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      jobFilter === 'tempo integral'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tempo integral
                  </button>
                  <button
                    onClick={() => setJobFilter('remoto')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      jobFilter === 'remoto'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Remoto
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de vagas */}
            {loadingJobs ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">A carregar vagas...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {jobSearch || jobFilter !== 'all' ? 'Nenhuma vaga encontrada' : 'Ainda não publicaste vagas'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {jobSearch || jobFilter !== 'all'
                    ? 'Tenta ajustar os filtros ou a pesquisa.'
                    : 'Publica a tua primeira vaga para atrair talentos.'}
                </p>
                {!(jobSearch || jobFilter !== 'all') && (
                  <button
                    onClick={() => setShowCreateJob(true)}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Publicar vaga
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  {filteredJobs.length} vaga{filteredJobs.length !== 1 ? 's' : ''}
                </p>
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </>
        ) : searching ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">A pesquisar talentos...</p>
          </div>
        ) : talents.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum talento encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Tenta ajustar os filtros ou remover algumas restrições para encontrar mais candidatos.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {talents.length} talento{talents.length !== 1 ? 's' : ''} encontrado{talents.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid gap-4">
              {talents.map((talent) => (
                <TalentCard key={talent.uid} talent={talent} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save search modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Guardar busca
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Guarda esta busca para acesso rápido mais tarde.
            </p>

            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Nome da busca (ex: Desenvolvedores React)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSearchName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSearch}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de criar vaga */}
      {showCreateJob && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Publicar nova vaga</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateJob(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <CreateJobForm onClose={() => setShowCreateJob(false)} onJobCreated={() => {
                setShowCreateJob(false);
                toast.success('Vaga publicada com sucesso!');
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TalentsPage;
