import { useState, useEffect, useRef } from 'react'
import { db } from '../services/firebase'
import { collection, onSnapshot, query, orderBy, getDoc, doc } from 'firebase/firestore'
import { PostCard } from '../components/PostCard'
import { JobCard } from '../components/JobCard'
import { CreatePostForm } from '../components/CreatePostForm'
import { CreateStoryModal } from '../components/CreateStoryModal'
import { ViewStoryModal } from '../components/ViewStoryModal'
import { OnboardingModal } from '../components/OnboardingModal'
import { useAuth } from '../hooks/useAuth'
import { getDailySuggestions } from '../services/matching'
import DiscoverCard from '../components/DiscoverCard'
import { Sparkles, X, Compass, Zap } from 'lucide-react'
import AIService from '../services/aiService'
// import { Loader } from 'lucide-react'

export const HomePage = () => {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const isFirstLoadRef = useRef(true)
  const [loadingStories, setLoadingStories] = useState(true)
  const [jobs, setJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const [viewingStory, setViewingStory] = useState(null)
  const [filterType, setFilterType] = useState('all') // all | young | company | jobs
  const [sortMode, setSortMode] = useState('recent') // recent | popular
  const [onlyConnections, setOnlyConnections] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [dailySuggestions, setDailySuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [mentorTip, setMentorTip] = useState('')
  const [loadingTip, setLoadingTip] = useState(true)
  const [showMentorTip, setShowMentorTip] = useState(true)

  // Check if first visit
  useEffect(() => {
    if (!user) return
    const key = `onboardingSeen:${user.uid}`
    if (!localStorage.getItem(key)) {
      setShowOnboarding(true)
    }
  }, [user])

  // Load daily suggestions (1x per day)
  useEffect(() => {
    if (!user) return

    const loadSuggestions = async () => {
      try {
        const suggestions = await getDailySuggestions(user.uid, user, user.type)
        setDailySuggestions(suggestions.slice(0, 3)) // Mostra apenas 3 no feed
        setLoadingSuggestions(false)
      } catch (error) {
        console.error('Erro ao carregar sugestões:', error)
        setLoadingSuggestions(false)
      }
    }

    loadSuggestions()
  }, [user])

  // Load Mentor Tip
  useEffect(() => {
    if (!user) return
    const fetchTip = async () => {
      try {
        const tip = await AIService.getDailyMentorTip(user)
        setMentorTip(tip)
      } catch (e) {
        console.error("Mentor tip error", e)
      } finally {
        setLoadingTip(false)
      }
    }
    fetchTip()
  }, [user])

  const handleOnboardingClose = () => {
    if (user) {
      localStorage.setItem(`onboardingSeen:${user.uid}`, 'true')
    }
    setShowOnboarding(false)
  }

  // Load posts
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'stories'),
      orderBy('timestamp', 'desc')
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Buscar todos os authorIds únicos
      const authorIds = Array.from(new Set(postsData.map(p => p.authorId).filter(Boolean)))
      // Buscar todos os usuários de uma vez (estático)
      const userDocs = await Promise.all(authorIds.map(uid =>
        uid ? getDoc(doc(db, 'users', uid)) : null
      ))
      const existingUserIds = new Set(
        userDocs
          .map((snap, i) => (snap && snap.exists() && authorIds[i]) ? authorIds[i] : null)
          .filter(Boolean)
      )
      // Filtrar posts apenas de autores existentes
      const filteredPosts = postsData.filter(p => existingUserIds.has(p.authorId))

      // (Som de notificação removido)

      setPosts(filteredPosts)
      setLoading(false)
      isFirstLoadRef.current = false
    })

    return () => unsubscribe()
  }, [user])

  // Load active stories (last 24 hours)
  useEffect(() => {
    if (!user) return

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const q = query(
      collection(db, 'userStories'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storiesData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(story => {
          // Filter stories from last 24 hours
          if (!story.createdAt) return false
          return story.createdAt.toDate() > twentyFourHoursAgo
        })

      setStories(storiesData)
      setLoadingStories(false)
    })

    return () => unsubscribe()
  }, [user])

  // Load jobs for "Só vagas"
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'jobs'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setJobs(jobsData)
      setLoadingJobs(false)
    })

    return () => unsubscribe()
  }, [user])

  const handlePostCreated = () => {
    // Feed atualiza automaticamente via real-time listener
  }

  const handleStoryCreated = () => {
    setShowCreateStory(false)
  }

  const handleViewStory = (storyIndex) => {
    setViewingStory(storyIndex)
  }

  // Group stories by user (show only latest per user)
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = story
    }
    return acc
  }, {})

  const userStories = Object.values(groupedStories)

  // Helper: check if job matches user skills
  const matchesUserSkills = (job) => {
    if (!user?.skills) return false
    const userSkills = Array.isArray(user.skills)
      ? user.skills.map(s => s.toLowerCase())
      : user.skills.split(',').map(s => s.trim().toLowerCase())
    const jobRequirements = (job.requirements || []).map(r => r.toLowerCase())
    return jobRequirements.some(req => userSkills.some(skill => req.includes(skill) || skill.includes(req)))
  }

  // Helper: check if job is new (< 24h)
  const isNewJob = (job) => {
    if (!job.createdAt) return false
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return job.createdAt.toDate() > twentyFourHoursAgo
  }

  // Derive filtered/sorted posts
  const followingSet = new Set(user?.following || [])
  const followerSet = new Set(user?.followers || [])
  const connectionSet = new Set([...followingSet].filter((uid) => followerSet.has(uid)))
  const displayedPosts = posts
    .filter(p => {
      // When "Apenas conexões" is active, show only mutual connections
      if (onlyConnections && !connectionSet.has(p.authorId)) return false
      if (filterType === 'young') return p.type === 'young'
      if (filterType === 'company') return p.type === 'company'
      return true
    })
    .sort((a, b) => {
      // PRIORIDADE: Posts de empresa sempre no topo
      const aIsCompany = a.type === 'company' ? 1 : 0;
      const bIsCompany = b.type === 'company' ? 1 : 0;
      if (aIsCompany !== bIsCompany) return bIsCompany - aIsCompany;

      // Tier 1: Mutual connections first
      const aIsMutual = connectionSet.has(a.authorId) ? 1 : 0;
      const bIsMutual = connectionSet.has(b.authorId) ? 1 : 0;
      if (aIsMutual !== bIsMutual) return bIsMutual - aIsMutual;

      // Tier 2: Following-only (includes companies followed)
      const aIsFollowing = followingSet.has(a.authorId) ? 1 : 0;
      const bIsFollowing = followingSet.has(b.authorId) ? 1 : 0;
      if (aIsFollowing !== bIsFollowing) return bIsFollowing - aIsFollowing;

      // Pinned/promoted next
      const aPin = a.pinned || a.promoted ? 1 : 0;
      const bPin = b.pinned || b.promoted ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;

      if (sortMode === 'popular') {
        const aLikes = (a.likes || []).length;
        const bLikes = (b.likes || []).length;
        if (aLikes !== bLikes) return bLikes - aLikes;
      }

      // Default by timestamp desc
      const aTime = a.timestamp?.toMillis?.() ?? 0;
      const bTime = b.timestamp?.toMillis?.() ?? 0;
      return bTime - aTime;
    })

  // Hide archived and paused jobs from feed (show only active)
  const feedJobs = jobs.filter((job) => job.status !== 'archived' && job.status !== 'paused')

  // Sort jobs: followed companies > recommended (skill match) > new > others
  const sortedJobs = feedJobs.sort((a, b) => {
    // Tier 1: Jobs from companies user follows
    const aFromFollowed = followingSet.has(a.companyId) ? 1 : 0
    const bFromFollowed = followingSet.has(b.companyId) ? 1 : 0
    if (aFromFollowed !== bFromFollowed) return bFromFollowed - aFromFollowed

    // Tier 2: Recommended jobs (match user skills)
    const aRecommended = matchesUserSkills(a) ? 1 : 0
    const bRecommended = matchesUserSkills(b) ? 1 : 0
    if (aRecommended !== bRecommended) return bRecommended - aRecommended

    // Tier 3: New jobs (< 24h)
    const aIsNew = isNewJob(a) ? 1 : 0
    const bIsNew = isNewJob(b) ? 1 : 0
    if (aIsNew !== bIsNew) return bIsNew - aIsNew

    // Default by createdAt desc
    const aTime = a.createdAt?.toMillis?.() ?? 0
    const bTime = b.createdAt?.toMillis?.() ?? 0
    return bTime - aTime
  })

  return (
    <div className="bg-gray-50 min-h-screen pt-14">
      <div className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-1 sm:px-2 md:px-6">
        {/* Stories Carousel */}
        <div className="bg-white px-2 sm:px-4 py-3 sm:py-4 mb-2">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide min-h-[90px]">
            {/* Add Story Button */}
            <div className="flex flex-col items-center flex-shrink-0">
              <button
                onClick={() => setShowCreateStory(true)}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-xl sm:text-2xl shadow-md hover:bg-green-700 transition active:scale-95"
              >
                +
              </button>
              <span className="text-xs mt-1 text-gray-700">Teu story</span>
            </div>

            {/* Stories: loading skeletons */}
            {loadingStories && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`story-skel-${i}`} className="flex flex-col items-center flex-shrink-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 animate-pulse" />
                    <span className="text-xs mt-1 text-transparent">.</span>
                  </div>
                ))}
              </>
            )}

            {/* Real Stories from Firebase */}
            {!loadingStories && userStories.map((story, index) => (
              <div
                key={story.id}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                onClick={() => handleViewStory(index)}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-green-600 p-0.5">
                  {story.userAvatar ? (
                    <img
                      src={story.userAvatar}
                      alt={story.userName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center font-semibold text-green-700">
                      {story.userName?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <span className="text-xs mt-1 text-gray-700 max-w-[48px] sm:max-w-[64px] truncate">
                  {story.userName || 'Usuário'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mentor Proactive Tip */}
        {showMentorTip && !loadingTip && mentorTip && (
          <div className="px-2 sm:px-4 mb-2">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                <Compass size={120} />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                      <Zap size={18} className="text-white" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Sebê-Non</span>
                  </div>
                  <button
                    onClick={() => setShowMentorTip(false)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-sm font-medium leading-relaxed italic">
                  "{mentorTip}"
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 w-12 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-2/3 animate-pulse"></div>
                  </div>
                  <span className="text-[10px] font-bold opacity-70">SABER MAIS</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Post Form (hidden in Jobs filter) */}
        {filterType !== 'jobs' && (
          <div className="px-2 sm:px-4">
            {user && <CreatePostForm onPostCreated={handlePostCreated} />}
          </div>
        )}

        {/* Daily Suggestions Slot (1x/dia, apenas no feed principal) */}
        {filterType === 'all' && showSuggestions && !loadingSuggestions && dailySuggestions.length > 0 && (
          <div className="px-2 sm:px-4 mb-4">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Sugestões para ti</h3>
                </div>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Esconder sugestões"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {dailySuggestions.map((suggestion, idx) => (
                  <DiscoverCard
                    key={`suggestion-${suggestion.uid || suggestion.jobId}-${idx}`}
                    item={suggestion}
                    type={suggestion.type}
                  />
                ))}
              </div>

              {user?.type === 'young' && (
                <button
                  onClick={() => window.location.href = '/discover'}
                  className="w-full mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Ver mais recomendações
                </button>
              )}

              {user?.type === 'company' && (
                <button
                  onClick={() => window.location.href = '/talents'}
                  className="w-full mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Procurar mais talentos
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-2 sm:px-4 mb-2">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'young', label: 'Jovens' },
              { key: 'company', label: 'Empresas' },
              { key: 'jobs', label: 'Só vagas' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${filterType === f.key
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-200'
                  }`}
              >
                {f.label}
              </button>
            ))}

            {filterType !== 'jobs' && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setSortMode(sortMode === 'recent' ? 'popular' : 'recent')}
                  className="px-3 py-1.5 rounded-full text-sm border bg-white text-gray-700 border-gray-200 whitespace-nowrap"
                >
                  {sortMode === 'recent' ? 'Mais recentes' : 'Mais populares'}
                </button>
                <button
                  onClick={() => setOnlyConnections(v => !v)}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${onlyConnections ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-200'
                    }`}
                >
                  Apenas conexões
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feed or Jobs */}
        {filterType === 'jobs' ? (
          <div className="px-2 sm:px-4 space-y-1 sm:space-y-2 pb-24">
            {loadingJobs ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`job-skel-${i}`} className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100 animate-pulse">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-10 bg-gray-100 rounded" />
                  </div>
                ))}
              </>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-2 sm:px-4">
                <p className="text-gray-500">Nenhuma vaga publicada ainda.</p>
              </div>
            ) : (
              sortedJobs.map((job) => (
                <PostCardWrapperJob
                  key={job.id}
                  job={job}
                  isNew={isNewJob(job)}
                  isRecommended={matchesUserSkills(job)}
                  isFromFollowed={followingSet.has(job.companyId)}
                />
              ))
            )}
          </div>
        ) : (
          <>
            {loading ? (
              <div className="px-2 sm:px-4 pb-24">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`post-skel-${i}`} className="bg-white rounded-xl p-2 sm:p-4 mb-2 sm:mb-3 shadow-sm border border-gray-100 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-3" />
                    <div className="h-48 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-2 sm:px-4">
                <p className="text-gray-500">
                  Nenhum post ainda. Seja o primeiro a compartilhar! 💡
                </p>
              </div>
            ) : (
              <div className="px-2 sm:px-4 space-y-1 sm:space-y-2 pb-24">
                {displayedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={handlePostCreated}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Story Modal */}
        {showCreateStory && (
          <CreateStoryModal
            onClose={() => setShowCreateStory(false)}
            onStoryCreated={handleStoryCreated}
          />
        )}

        {/* View Story Modal */}
        {viewingStory !== null && (
          <ViewStoryModal
            stories={userStories}
            initialIndex={viewingStory}
            onClose={() => setViewingStory(null)}
          />
        )}

        {/* Onboarding Tutorial */}
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={handleOnboardingClose}
        />
      </div>
    </div>
  )
}

// Local lightweight wrapper to render JobCard like feed items without changing PostCard API
const PostCardWrapperJob = ({ job, isNew, isRecommended, isFromFollowed }) => {
  return (
    <div className="relative">
      {(isNew || isRecommended || isFromFollowed) && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          {isNew && (
            <span className="px-2 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full shadow-sm">
              NOVA
            </span>
          )}
          {isRecommended && (
            <span className="px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-full shadow-sm">
              RECOMENDADA
            </span>
          )}
          {isFromFollowed && (
            <span className="px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-sm">
              EMPRESA SEGUIDA
            </span>
          )}
        </div>
      )}
      <JobCard job={job} />
    </div>
  )
}
