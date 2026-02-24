import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'
import { useStreamChat } from '../hooks/useStreamChat'
import { X, Search } from 'lucide-react'

export const NewChatModal = ({ onClose, onSelectUser }) => {
  const { user, userType } = useAuth()
  const { chatClient, createChannel } = useStreamChat()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Calcular conexões mútuas (following E followers)
        const followingSet = new Set(user?.following || [])
        const followerSet = new Set(user?.followers || [])
        const connectionSet = new Set([...followingSet].filter((uid) => followerSet.has(uid)))
        
        let usersData = []
        
        if (userType === 'young') {
          // Jovens veem TODOS (outros jovens + empresas) MAS só os que são conexões
          const allUsersSnapshot = await getDocs(collection(db, 'users'))
          usersData = allUsersSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => u.id !== user.uid) // Excluir usuário atual
            .filter(u => {
              // Para empresas, basta estar seguindo (empresas não seguem de volta)
              if (u.type === 'company') return followingSet.has(u.id)
              // Para outros jovens, precisa ser conexão mútua
              return connectionSet.has(u.id)
            })
        } else {
          // Empresas veem TODOS os jovens (sem restrição de conexão)
          const q = query(
            collection(db, 'users'),
            where('type', '==', 'young')
          )
          const snapshot = await getDocs(q)
          usersData = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => u.id !== user.uid)
        }
        
        setUsers(usersData)
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [user.uid, user.following, user.followers, userType])

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelectUser = async (selectedUser) => {
    try {
      // Usar função helper para criar canal
      const channelId = await createChannel(
        selectedUser.id, 
        selectedUser.displayName || selectedUser.email
      )
      
      // Obter canal criado
      const channel = chatClient.channel('messaging', channelId)
      await channel.watch()
      
      onSelectUser(channel)
      onClose()
    } catch (error) {
      console.error('Erro ao criar canal:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 touch-none">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 h-full sm:h-auto max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-xl font-bold text-gray-900">Nova Conversa</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={22} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto bg-gray-50" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-green-600 border-t-transparent"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-400" size={28} />
              </div>
              <p className="text-gray-600 font-medium">
                {search ? 'Nenhum resultado encontrado' : 'Nenhuma conexão disponível'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {search ? 'Tenta outro termo' : 'Conecta-te com outros usuários primeiro para iniciar conversas'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((targetUser) => (
                <button
                  key={targetUser.id}
                  onClick={() => handleSelectUser(targetUser)}
                  className="w-full px-5 py-4 hover:bg-white active:bg-gray-100 transition-colors flex items-center gap-4 text-left"
                >
                  {targetUser.avatar || targetUser.photoURL ? (
                    <img
                      src={targetUser.avatar || targetUser.photoURL}
                      alt={targetUser.displayName}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {(targetUser.displayName || targetUser.email)?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{targetUser.displayName || 'Usuário'}</p>
                    <div className="flex gap-2 mt-1.5">
                      {targetUser.type === 'company' && (
                        <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                          Empresa
                        </span>
                      )}
                      {targetUser.type === 'young' && (
                        <span className="inline-block px-2.5 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                          Jovem
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
