import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { findNearbyCandidates, findInterestedCompanies, findRecommendedJobs } from '../services/matching';
import DiscoverCard from '../components/DiscoverCard';
import { Sparkles, Users, Building2, Briefcase, Loader2, RefreshCw, Plus, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { JobCard } from '../components/JobCard';
import { CreateJobForm } from '../components/CreateJobForm';
import CoursesPage from './CoursesPage';

const DiscoverPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [candidates, setCandidates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loadingAllJobs, setLoadingAllJobs] = useState(true);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobFilter, setJobFilter] = useState('all'); // all | estagio | tempo integral | remoto
  const [jobSearch, setJobSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadRecommendations = async (showToast = false) => {
    if (!user) return;

    setRefreshing(true);
    try {
      console.log('🔍 Carregando recomendações para:', user.uid);

      // Buscar perfil completo do Firestore (user do AuthContext pode não ter todos os campos)
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userProfile = user;
      if (userDocSnap.exists()) {
        userProfile = { ...user, ...userDocSnap.data() };
        console.log('📋 Perfil completo carregado:', userProfile);
      } else {
        console.warn('⚠️ Documento do usuário não encontrado no Firestore, usando perfil do Auth');
        console.log('📋 Perfil do Auth:', user);
      }

      // Chamar backend para recomendações principais
      console.log('🔄 Chamando v4_getMatches...');
      const getMatchesCall = httpsCallable(functions, 'v4_getMatches');

      let matchesResult;
      try {
        const response = await getMatchesCall({ limit: 200 });
        matchesResult = response.data;
      } catch (err) {
        console.warn('⚠️ Falha na Cloud Function, usando busca direta no Firestore como fallback:', err);
        // Fallback: Buscar todos os jovens diretamente se a função falhar
        const usersRef = collection(db, 'users');
        const { getDocs, where, query: fsQuery, limit: fsLimit } = await import('firebase/firestore');
        const q = fsQuery(usersRef, where('type', '==', 'young'), fsLimit(200));
        const snapshot = await getDocs(q);
        const fallbackSuggestions = snapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data(), type: 'candidate', matchScore: 100 }))
          .filter(u => u.uid !== user.uid);

        matchesResult = { success: true, suggestions: fallbackSuggestions };
      }

      console.log('✨ Recomendações (Final):', matchesResult);

      if (matchesResult.success) {
        // Just take the suggestions directly (they are already candidates)
        setCandidates(matchesResult.suggestions);
      }

      // Buscar empresas e vagas (podem ser migradas depois para o backend)
      const [companiesData, jobsData] = await Promise.all([
        findInterestedCompanies(userProfile, 10),
        findRecommendedJobs(userProfile, 15)
      ]);

      console.log('✅ Empresas encontradas:', companiesData.length, companiesData);
      console.log('✅ Vagas encontradas:', jobsData.length, jobsData);

      setCompanies(companiesData);
      setJobs(jobsData);

      if (showToast) {
        toast.success('Recomendações atualizadas!');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar recomendações:', error);
      toast.error('Erro ao carregar recomendações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load all jobs (para aba Vagas)
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
      setLoadingAllJobs(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleRefresh = () => {
    loadRecommendations(true);
  };

  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase().trim();

    switch (activeTab) {
      case 'candidates': {
        // Mostra TODOS os candidatos na aba Jovens (sem filtro de score)
        let result = candidates.map(c => ({ ...c, type: 'candidate' }));

        // Aplicar filtro de busca
        if (query) {
          result = result.filter(c =>
            c.name?.toLowerCase().includes(query) ||
            c.displayName?.toLowerCase().includes(query) ||
            c.bio?.toLowerCase().includes(query) ||
            c.location?.toLowerCase().includes(query) ||
            (Array.isArray(c.skills) ? c.skills : []).some(skill =>
              skill.toLowerCase().includes(query)
            )
          );
        }

        console.log('👥 Filtro Jovens:', {
          totalCandidates: candidates.length,
          resultCount: result.length,
          searchQuery: query,
          resultData: result.map(r => ({
            name: r.name,
            displayName: r.displayName,
            uid: r.uid,
            type: r.type,
            matchScore: r.matchScore,
            avatar: r.avatar
          }))
        });

        return result;
      }

      case 'companies': {
        let result = companies.map(c => ({ ...c, type: 'company' }));

        // Aplicar filtro de busca
        if (query) {
          result = result.filter(c =>
            c.name?.toLowerCase().includes(query) ||
            c.displayName?.toLowerCase().includes(query) ||
            c.bio?.toLowerCase().includes(query) ||
            c.location?.toLowerCase().includes(query)
          );
        }

        return result;
      }

      default: { // 'all' - Recomendações
        // Tenta mostrar recomendações de qualidade (score >= 40)
        const highQualityItems = [
          ...candidates.filter(c => c.matchScore >= 40).map(c => ({ ...c, type: 'candidate' })),
          ...companies.filter(c => c.matchScore >= 40).map(c => ({ ...c, type: 'company' })),
          ...jobs.filter(j => j.matchScore >= 40).map(j => ({ ...j, type: 'job' }))
        ].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        // Se tiver recomendações de qualidade, mostra elas
        if (highQualityItems.length > 0) {
          return highQualityItems;
        }

        // Fallback: mostra mix de tudo (vagas, empresas, jovens)
        return [
          ...jobs.slice(0, 5).map(j => ({ ...j, type: 'job' })),
          ...companies.slice(0, 3).map(c => ({ ...c, type: 'company' })),
          ...candidates.slice(0, 3).map(c => ({ ...c, type: 'candidate' }))
        ].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      }
    }
  };

  // Filtrar todas as vagas (aba Vagas)
  const getFilteredJobs = () => {
    let filtered = allJobs.filter(job => job.status !== 'archived' && job.status !== 'paused');

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
        job.companyName?.toLowerCase().includes(searchLower) ||
        job.location?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredItems = getFilteredItems();
  const filteredJobs = getFilteredJobs();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">A carregar recomendações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 md:px-6">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-900">Descobrir</h1>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                title="Atualizar recomendações"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {user?.type === 'young' ? (
                <>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Recomendações
                  </button>

                  <button
                    onClick={() => setActiveTab('candidates')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'candidates'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <Users className="w-4 h-4" />
                    Jovens ({candidates.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('companies')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'companies'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Empresas ({companies.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('academia')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'academia'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Academia
                  </button>

                  <button
                    onClick={() => setActiveTab('allJobs')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'allJobs'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    Todas as vagas ({allJobs.length})
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('allJobs')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'allJobs'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    Minhas vagas ({allJobs.filter(j => j.companyId === user.uid).length})
                  </button>

                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Todas ({allJobs.length})
                  </button>
                </>
              )}
            </div>

            {/* Search bar para Jovens e Empresas */}
            {(activeTab === 'candidates' || activeTab === 'companies') && (
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'candidates' ? 'Procurar jovens por nome, localização, skills...' : 'Procurar empresas por nome, localização...'}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Aba de Vagas completa */}
          {activeTab === 'allJobs' ? (
            <>
              {/* Filtros de vagas */}
              <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="space-y-3">
                  {/* Search bar */}
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="Procurar vagas por título, empresa, localização..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />

                  {/* Filter chips */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setJobFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${jobFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setJobFilter('estagio')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${jobFilter === 'estagio'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Estágios
                    </button>
                    <button
                      onClick={() => setJobFilter('tempo integral')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${jobFilter === 'tempo integral'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Tempo integral
                    </button>
                    <button
                      onClick={() => setJobFilter('remoto')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${jobFilter === 'remoto'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Remoto
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão criar vaga (só para empresas) */}
              {user?.type === 'company' && (
                <button
                  onClick={() => setShowCreateJob(true)}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Publicar nova vaga
                </button>
              )}

              {/* Lista de vagas */}
              {loadingAllJobs ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600">A carregar vagas...</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma vaga encontrada
                  </h3>
                  <p className="text-gray-600">
                    {jobSearch || jobFilter !== 'all'
                      ? 'Tenta ajustar os filtros ou a pesquisa.'
                      : 'Ainda não há vagas publicadas.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    {filteredJobs.length} vaga{filteredJobs.length !== 1 ? 's' : ''} encontrada{filteredJobs.length !== 1 ? 's' : ''}
                  </p>
                  {filteredJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum resultado encontrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Tenta procurar com outras palavras-chave
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Limpar pesquisa
                  </button>
                </>
              ) : (
                <>
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma recomendação por agora
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Completa o teu perfil com skills, experiência e interesses para receberes recomendações personalizadas.
                  </p>
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Completar perfil
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info banner */}
              {activeTab === 'all' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-sm text-indigo-900">
                    <strong>✨ Recomendações inteligentes:</strong> Estas sugestões são baseadas nas tuas skills,
                    localização, experiência e interesses. Quanto mais completo o teu perfil, melhores as recomendações!
                  </p>
                </div>
              )}

              {/* Cards grid */}
              <div className="grid gap-4">
                {activeTab === 'academia' ? (
                  <CoursesPage isTab={true} />
                ) : (
                  filteredItems.map((item, index) => (
                    <DiscoverCard
                      key={`${item.type}-${item.uid || item.jobId}-${index}`}
                      item={item}
                      type={item.type}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
};

export default DiscoverPage;
