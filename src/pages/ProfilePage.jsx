import Modal from '../components/Modal'
import { useAuth } from '../hooks/useAuth'
import { useState, useEffect, useRef } from 'react'
// ...existing code...


// Estado para controlar o modal de avatar em tela cheia

import { db } from '../services/firebase'
import { collection, query, where, onSnapshot, orderBy, doc } from 'firebase/firestore'
import { MapPin, Briefcase, GraduationCap, LogOut, Edit2, Linkedin, Github, Instagram, Globe, Bell, BellRing, MoreVertical } from 'lucide-react'
import { PostCard } from '../components/PostCard'
// import { useStreamChat } from '../hooks/useStreamChat'
import toast from 'react-hot-toast'
import { EditProfileModal } from '../components/EditProfileModal'
import { registerForPush, testPushPing } from '../services/notifications'
import { generateResume } from '../services/resume'
import { FileDown } from 'lucide-react'
import { AmbassadorBadge } from '../components/AmbassadorBadge'

const VerifiedBadge = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="12" r="12" fill="#1a73e8" />
    <polyline
      points="7 12 10.5 15.5 17 9"
      stroke="white"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

export const ProfilePage = () => {
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const { user, userType, logout } = useAuth()
  // const { chatClient } = useStreamChat()
  const [showEdit, setShowEdit] = useState(false)
  const [userPosts, setUserPosts] = useState([])
  const [stats, setStats] = useState({
    posts: 0,
    communities: 0,
    connections: 0
  })
  const [notifEnabling, setNotifEnabling] = useState(false)
  const [notifSupported, setNotifSupported] = useState(false)
  const [notifPermission, setNotifPermission] = useState('default')
  const [menuOpen, setMenuOpen] = useState(false)

  const menuRef = useRef(null)
  // Local form data removed; editing now handled in EditProfileModal

  // Carregar posts do usuário
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'stories'),
      where('authorId', '==', user.uid),
      orderBy('timestamp', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setUserPosts(posts)
      setStats(prev => ({ ...prev, posts: posts.length }))
    })

    return () => unsubscribe()
  }, [user])

  // Notifications support/permission
  useEffect(() => {
    try {
      const supported = typeof window !== 'undefined' && 'Notification' in window
      setNotifSupported(!!supported)
      if (supported) {
        setNotifPermission(Notification.permission)
      }
    } catch {
      setNotifSupported(false)
    }
  }, [])

  // Close menu on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Carregar estatísticas (comunidades e conexões)
  useEffect(() => {
    if (!user) return;

    // Buscar número de seguidores (followers) do próprio usuário pelo ID do documento
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setStats(prev => ({
          ...prev,
          connections: Array.isArray(userData.followers) ? userData.followers.length : 0
        }));
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Editing logic moved to EditProfileModal for a friendlier UX

  const handleLogout = async () => {
    if (window.confirm('Tens certeza que queres sair?')) {
      try {
        await logout()
        toast.success('Desconectado com sucesso')
      } catch (error) {
        toast.error(error.message)
      }
    }
  }

  const ensureProtocol = (url) => {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    return `https://${url}`
  }

  const hasPushActive = () => {
    const tokens = Array.isArray(user?.fcmTokens) ? user.fcmTokens : []
    return (notifSupported && notifPermission === 'granted' && tokens.length > 0)
  }

  const handleEnableNotifications = async () => {
    if (!notifSupported) {
      toast.error('Notificações não são suportadas neste dispositivo')
      return
    }
    try {
      setNotifEnabling(true)
      // Request permission if not already granted
      let permission = notifPermission
      if (permission !== 'granted' && typeof Notification !== 'undefined') {
        permission = await Notification.requestPermission()
        setNotifPermission(permission)
      }
      if (permission === 'granted') {
        const token = await registerForPush(user?.uid)
        if (token) {
          toast.success('Notificações ativas!')
        } else {
          toast('Notificações ativadas, pronto!')
        }
      } else if (permission === 'denied') {
        toast.error('Permissão negada. Ativa nas configurações do navegador.')
      }
    } catch (e) {
      console.error('Falha ao ativar notificações', e)
      toast.error('Não foi possível ativar as notificações')
    } finally {
      setNotifEnabling(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-14">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 md:px-6">
        {/* Profile Header Banner */}
        <div className="bg-green-600 px-4 pt-6 pb-8 relative">
          {/* Header Actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2" ref={menuRef}>
            {notifSupported && (
              <button
                onClick={handleEnableNotifications}
                disabled={hasPushActive() || notifEnabling}
                className={`bg-white/90 text-green-700 px-3 py-1.5 rounded-full font-semibold transition hover:bg-white text-xs shadow-sm inline-flex items-center gap-1 disabled:opacity-60`}
                title={hasPushActive() ? 'Notificações ativas' : 'Ativar notificações'}
              >
                {hasPushActive() ? <BellRing size={14} /> : <Bell size={14} />}
                <span className="hidden md:inline">{hasPushActive() ? 'Ativas' : (notifEnabling ? 'Ativando...' : 'Ativar')}</span>
              </button>
            )}
            {/* Overflow menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="bg-white/90 hover:bg-white text-green-700 p-1.5 rounded-full shadow-sm"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="Mais opções"
              >
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden z-20">
                  <button
                    onClick={() => { setShowEdit(true); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                  >
                    <Edit2 size={14} /> Editar perfil
                  </button>
                  <div className="h-px bg-gray-100" />
                  <button
                    onClick={async () => {
                      if (user?.uid) {
                        try {
                          toast.loading('A preparar o teu CV...', { id: 'cv-gen' });
                          await generateResume(user);
                          toast.success('CV descarregado!', { id: 'cv-gen' });
                        } catch (err) {
                          console.error('Erro ao gerar CV:', err);
                          toast.error('Erro ao gerar o CV', { id: 'cv-gen' });
                        }
                      }
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 inline-flex items-center gap-2"
                  >
                    <FileDown size={14} /> Descarregar CV
                  </button>
                  <div className="h-px bg-gray-100" />
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      try {
                        toast.loading('A enviar ping de teste...', { id: 'ping-test' });
                        await testPushPing();
                        toast.success('Notificação de teste enviada! Verifica o teu telemóvel.', { id: 'ping-test' });
                      } catch (err) {
                        toast.error('Erro ao enviar notificação de teste.', { id: 'ping-test' });
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 inline-flex items-center gap-2"
                  >
                    <BellRing size={14} /> Testar Notificações
                  </button>
                  <div className="h-px bg-gray-100" />
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                  >
                    <LogOut size={14} /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Header Content Row */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user?.displayName}
                  className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg cursor-pointer"
                  onClick={() => setShowAvatarModal(true)}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white text-green-600 flex items-center justify-center text-xl font-bold border-4 border-white shadow-lg">
                  {(user?.displayName || 'VS').slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Modal para exibir avatar em tela cheia */}
              {user?.photoURL && showAvatarModal && (
                <Modal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)}>
                  <div className="relative flex flex-col items-center justify-center h-full w-full p-4">
                    <button
                      onClick={() => setShowAvatarModal(false)}
                      className="absolute top-4 right-4 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition z-10"
                      aria-label="Fechar"
                    >
                      Fechar
                    </button>
                    <img
                      src={user.photoURL}
                      alt={user?.displayName}
                      className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border-4 border-white"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                </Modal>

              )}
            </div>

            {/* Text block */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white leading-tight truncate">
                  {userType === 'company' ? (user?.company || user?.displayName || 'Empresa') : (user?.displayName || 'Usuário')}
                </h1>
                {user?.emailVerified && <VerifiedBadge size={18} className="text-white fill-white flex-shrink-0" />}
                {user?.isAmbassador && <AmbassadorBadge size={18} />}
                {userType === 'young' && user?.openToMessages && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-white/90 text-green-700 text-[10px] font-semibold tracking-wide">Aberto a mensagens</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-white/90 text-xs mt-1">
                <MapPin size={12} />
                <span className="truncate">{user?.location || 'São Tomé e Príncipe'}</span>
              </div>
              <p className="mt-2 text-white/90 text-xs leading-relaxed line-clamp-3">{user?.bio || 'Sem bio ainda'}</p>
              {/* Social links */}
              {(() => {
                const socials = user?.socials || {}
                const website = user?.website
                const items = []
                if (socials?.linkedin) items.push({ type: 'linkedin', url: ensureProtocol(socials.linkedin) })
                if (socials?.github) items.push({ type: 'github', url: ensureProtocol(socials.github) })
                if (socials?.instagram) items.push({ type: 'instagram', url: ensureProtocol(socials.instagram) })
                if (website) items.push({ type: 'website', url: ensureProtocol(website) })
                if (items.length === 0) return null
                return (
                  <div className="mt-2 flex items-center gap-2">
                    {items.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/90 hover:bg-white text-green-700">
                        {s.type === 'linkedin' && <Linkedin size={16} />}
                        {s.type === 'github' && <Github size={16} />}
                        {s.type === 'instagram' && <Instagram size={16} />}
                        {s.type === 'website' && <Globe size={16} />}
                      </a>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Stats Card visível (sem sobreposição ao banner) */}
        <div className="mx-4 mt-3 rounded-xl bg-white ring-1 ring-gray-100 shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            <div className="p-4 text-center">
              <p className="text-3xl font-extrabold text-gray-900 leading-none">{stats.connections}</p>
              <p className="text-xs text-gray-600 mt-1">Conexões</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-3xl font-extrabold text-gray-900 leading-none">{stats.posts}</p>
              <p className="text-xs text-gray-600 mt-1">Posts</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-3xl font-extrabold text-gray-900 leading-none">{stats.communities}</p>
              <p className="text-xs text-gray-600 mt-1">Comunidades</p>
            </div>
          </div>
        </div>

        {/* Ambassador Card */}
        {user?.isAmbassador && (
          <div className="mx-4 mt-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 ring-1 ring-amber-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <AmbassadorBadge size={28} />
              <div>
                <p className="text-sm font-bold text-amber-900">Embaixador(a) Oficial</p>
                <p className="text-xs text-amber-700">Representas a comunidade JovensSTP como embaixador(a) da plataforma</p>
              </div>
            </div>
          </div>
        )}

        {/* Education/Company Section */}
        <div className="px-4 mt-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex items-start gap-3">
              {userType === 'young' ? (
                <>
                  <GraduationCap className="text-green-600 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Educação</p>
                    {Array.isArray(user?.education) ? (
                      <div className="space-y-1">
                        {user.education.length === 0 ? (
                          <p className="text-gray-500 text-sm">Não especificado</p>
                        ) : (
                          [...user.education]
                            .sort((a, b) => {
                              const ay = parseInt(a?.endYear || a?.startYear || '0', 10)
                              const by = parseInt(b?.endYear || b?.startYear || '0', 10)
                              // Put ongoing (no endYear) first when same start
                              const aEndEmpty = !a?.endYear
                              const bEndEmpty = !b?.endYear
                              if (ay === by) return (aEndEmpty === bEndEmpty) ? 0 : (aEndEmpty ? -1 : 1)
                              return by - ay
                            })
                            .map((ed, idx) => (
                              <p key={idx} className="text-gray-700 text-sm">
                                {(ed?.institution || 'Instituição')} - {(ed?.degree || 'Grau')} {(ed?.startYear || ed?.endYear) ? (
                                  <span className="text-gray-500">({ed?.startYear || ''}{ed?.startYear ? ' - ' : ''}{ed?.endYear ? ed.endYear : 'Presente'})</span>
                                ) : null}
                              </p>
                            ))
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-700 text-sm">{user?.education || 'Não especificado'}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Briefcase className="text-green-600 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Empresa</p>
                    <p className="text-gray-700 text-sm">{user?.company || 'Não especificado'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Experiência (Young) */}
        {userType === 'young' && (
          <div className="px-4 mt-3">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-2">Experiência</p>
              {Array.isArray(user?.experience) ? (
                user.experience.length === 0 ? (
                  <p className="text-gray-500 text-sm">Não especificado</p>
                ) : (
                  <div className="space-y-2">
                    {[...user.experience]
                      .sort((a, b) => {
                        const ay = parseInt(a?.endYear || a?.startYear || '0', 10)
                        const by = parseInt(b?.endYear || b?.startYear || '0', 10)
                        const aEndEmpty = !a?.endYear
                        const bEndEmpty = !b?.endYear
                        if (ay === by) return (aEndEmpty === bEndEmpty) ? 0 : (aEndEmpty ? -1 : 1)
                        return by - ay
                      })
                      .map((ex, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          <p className="font-medium">{ex?.company || 'Empresa'} — {ex?.role || 'Cargo'}</p>
                          {(ex?.startYear || ex?.endYear) && (
                            <p className="text-gray-500">{ex?.startYear || ''}{ex?.startYear ? ' - ' : ''}{ex?.endYear ? ex.endYear : 'Presente'}</p>
                          )}
                          {ex?.description && (
                            <p className="text-gray-700 mt-1">{ex.description}</p>
                          )}
                        </div>
                      ))}
                  </div>
                )
              ) : (
                <p className="text-gray-500 text-sm">Não especificado</p>
              )}
            </div>
          </div>
        )}

        {/* Skills (Young) */}
        {userType === 'young' && (
          <div className="px-4 mt-3">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-2">Skills</p>
              {(() => {
                const skills = Array.isArray(user?.skills)
                  ? user.skills
                  : (typeof user?.skills === 'string' && user.skills.trim().length > 0
                    ? user.skills.split(',').map(s => s.trim()).filter(Boolean)
                    : [])

                return skills.length === 0 ? (
                  <p className="text-gray-500 text-sm">Não adicionaste skills ainda</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={`${s}-${i}`} className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* User Posts */}
        <div className="px-4 mt-6">
          <h3 className="text-lg font-bold mb-3 text-gray-900">Meus Posts</h3>
          {userPosts.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <p className="text-gray-500 text-sm">Ainda não publicaste nenhum post</p>
            </div>
          ) : (
            <div className="space-y-2">
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Logout moved to header overflow menu for better discoverability */}

        {/* Edit Profile Modal */}
        {showEdit && (
          <EditProfileModal
            isOpen={showEdit}
            onClose={() => setShowEdit(false)}
          />)
        }
      </div>
    </div>
  )
}
