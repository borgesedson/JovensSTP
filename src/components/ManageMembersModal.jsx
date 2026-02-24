import { useEffect, useState } from 'react'
import { X, UserCog, Shield, Crown, UserMinus, Ban, Undo2 } from 'lucide-react'
import { db } from '../services/firebase'
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, deleteField } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export const ManageMembersModal = ({ community, isOpen, onClose }) => {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [bannedMembers, setBannedMembers] = useState([])

  useEffect(() => {
    if (!isOpen || !community) return
    const loadMembers = async () => {
      setLoading(true)
      try {
        const membersList = community.members || []
        const membersData = await Promise.all(
          membersList.map(async (uid) => {
            const userDoc = await getDoc(doc(db, 'users', uid))
            if (userDoc.exists()) {
              const role = community.roles?.[uid] || 'member'
              return { uid, ...userDoc.data(), role }
            }
            return null
          })
        )
        setMembers(membersData.filter(Boolean))

        // Carregar banidos (se houver)
        const bannedList = community.banned || []
        if (bannedList.length) {
          const bannedData = await Promise.all(
            bannedList.map(async (uid) => {
              const userDoc = await getDoc(doc(db, 'users', uid))
              if (userDoc.exists()) {
                return { uid, ...userDoc.data() }
              }
              return null
            })
          )
          setBannedMembers(bannedData.filter(Boolean))
        } else {
          setBannedMembers([])
        }
      } catch (e) {
        console.error(e)
        toast.error('Erro ao carregar membros')
      } finally {
        setLoading(false)
      }
    }
    loadMembers()
  }, [isOpen, community])

  if (!isOpen) return null

  const isOwner = user?.uid === community?.createdBy || community?.roles?.[user?.uid] === 'owner'
  const isMod = community?.roles?.[user?.uid] === 'mod'

  const promoteToMod = async (member) => {
    if (!isOwner) return
    setProcessing(member.uid)
    try {
      const ref = doc(db, 'communities', community.id)
      const updates = {}
      updates[`roles.${member.uid}`] = 'mod'
      await updateDoc(ref, updates)
      toast.success(`${member.displayName} promovido a moderador`)
      setMembers(prev => prev.map(m => m.uid === member.uid ? { ...m, role: 'mod' } : m))
    } catch (e) {
      console.error(e)
      toast.error('Erro ao promover')
    } finally {
      setProcessing(null)
    }
  }

  const demoteToMember = async (member) => {
    if (!isOwner) return
    setProcessing(member.uid)
    try {
      const ref = doc(db, 'communities', community.id)
      const updates = {}
      updates[`roles.${member.uid}`] = 'member'
      await updateDoc(ref, updates)
      toast.success(`${member.displayName} removido de moderador`)
      setMembers(prev => prev.map(m => m.uid === member.uid ? { ...m, role: 'member' } : m))
    } catch (e) {
      console.error(e)
      toast.error('Erro ao remover papel')
    } finally {
      setProcessing(null)
    }
  }

  const removeMember = async (member) => {
    if (!isOwner && !isMod) return
    if (!confirm(`Remover ${member.displayName} da comunidade?`)) return
    setProcessing(member.uid)
    try {
      const ref = doc(db, 'communities', community.id)
      const updates = { members: arrayRemove(member.uid) }
      updates[`roles.${member.uid}`] = deleteField()
      await updateDoc(ref, updates)
      toast.success('Membro removido')
      setMembers(prev => prev.filter(m => m.uid !== member.uid))
    } catch (e) {
      console.error(e)
      toast.error('Erro ao remover membro')
    } finally {
      setProcessing(null)
    }
  }

  const banMember = async (member) => {
    if (!isOwner && !isMod) return
    if (!confirm(`Banir ${member.displayName}? Ele não poderá voltar até ser desbanido.`)) return
    setProcessing(`ban-${member.uid}`)
    try {
      const ref = doc(db, 'communities', community.id)
      const updates = {
        members: arrayRemove(member.uid),
        banned: arrayUnion(member.uid)
      }
      updates[`roles.${member.uid}`] = deleteField()
      await updateDoc(ref, updates)
      toast.success('Membro banido')
      setMembers(prev => prev.filter(m => m.uid !== member.uid))
      setBannedMembers(prev => [...prev, member])
    } catch (e) {
      console.error(e)
      toast.error('Erro ao banir membro')
    } finally {
      setProcessing(null)
    }
  }

  const unbanMember = async (member) => {
    if (!isOwner && !isMod) return
    if (!confirm(`Remover ban de ${member.displayName}?`)) return
    setProcessing(`unban-${member.uid}`)
    try {
      const ref = doc(db, 'communities', community.id)
      // Não existe arrayRemove condicional composto com outros updates aqui
      await updateDoc(ref, { banned: arrayRemove(member.uid) })
      toast.success('Ban removido')
      setBannedMembers(prev => prev.filter(m => m.uid !== member.uid))
    } catch (e) {
      console.error(e)
      toast.error('Erro ao remover ban')
    } finally {
      setProcessing(null)
    }
  }

  const getRoleLabel = (role) => {
    if (role === 'owner') return <span className="text-yellow-600 flex items-center gap-1"><Crown size={12}/> Dono</span>
    if (role === 'mod') return <span className="text-purple-600 flex items-center gap-1"><Shield size={12}/> Moderador</span>
    return <span className="text-gray-500">Membro</span>
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserCog className="text-green-600" size={20} />
            <h2 className="font-bold">Gerir Membros</h2>
            <span className="text-sm text-gray-500">({members.length})</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Carregando...</div>
          ) : members.length === 0 ? (
            <div className="py-10 text-center text-gray-400">Sem membros</div>
          ) : (
            <div className="divide-y">
              {members.map((m) => {
                const isSelf = m.uid === user?.uid
                const isOwnerMember = m.uid === community?.createdBy || m.role === 'owner'
                const canPromote = isOwner && !isOwnerMember && m.role !== 'mod'
                const canDemote = isOwner && m.role === 'mod'
                const canRemove = (isOwner || isMod) && !isOwnerMember && !isSelf
                const canBan = canRemove

                return (
                  <div key={m.uid} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                        {m.photoURL ? (
                          <img src={m.photoURL} alt={m.displayName} className="w-full h-full object-cover"/>
                        ) : (
                          <span className="text-sm font-semibold">{(m.displayName||'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{m.displayName}</p>
                        <p className="text-xs">{getRoleLabel(m.role)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canPromote && (
                        <button 
                          onClick={() => promoteToMod(m)} 
                          disabled={processing===m.uid}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 text-xs inline-flex items-center gap-1"
                        >
                          <Shield size={12}/> Promover a Mod
                        </button>
                      )}
                      {canDemote && (
                        <button 
                          onClick={() => demoteToMember(m)} 
                          disabled={processing===m.uid}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 text-xs inline-flex items-center gap-1"
                        >
                          <UserMinus size={12}/> Remover Mod
                        </button>
                      )}
                      {canRemove && (
                        <button 
                          onClick={() => removeMember(m)} 
                          disabled={processing===m.uid}
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 text-xs inline-flex items-center gap-1"
                        >
                          <UserMinus size={12}/> Remover
                        </button>
                      )}
                      {canBan && (
                        <button
                          onClick={() => banMember(m)}
                          disabled={processing===`ban-${m.uid}`}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-xs inline-flex items-center gap-1"
                        >
                          <Ban size={12}/> Banir
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {/* Lista de banidos */}
        {bannedMembers.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700"><Ban size={14}/> Banidos ({bannedMembers.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {bannedMembers.map(b => (
                <div key={b.uid} className="flex items-center justify-between bg-white rounded-lg border p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {b.photoURL ? <img src={b.photoURL} className="w-full h-full object-cover" /> : <span className="text-[11px] font-semibold">{(b.displayName||'U').charAt(0).toUpperCase()}</span>}
                    </div>
                    <p className="text-xs font-medium truncate max-w-[140px]">{b.displayName || 'Utilizador'}</p>
                  </div>
                  {(isOwner || isMod) && (
                    <button
                      onClick={() => unbanMember(b)}
                      disabled={processing===`unban-${b.uid}`}
                      className="px-2.5 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 text-[11px] inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Undo2 size={11}/> Desbanir
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
