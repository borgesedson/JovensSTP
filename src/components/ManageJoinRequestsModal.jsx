import { useEffect, useState } from 'react'
import { X, UserPlus, Check, XCircle, Clock } from 'lucide-react'
import { db } from '../services/firebase'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore'
import { sendPushNotification } from '../services/notifications'
import toast from 'react-hot-toast'

export const ManageJoinRequestsModal = ({ communityId, isOpen, onClose }) => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    if (!isOpen || !communityId) return
    const ref = collection(db, 'joinRequests')
    const q = query(ref, where('communityId', '==', communityId), where('status', '==', 'pending'), orderBy('timestamp', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setRequests(items)
      setLoading(false)
    })
    return () => unsub()
  }, [isOpen, communityId])

  if (!isOpen) return null

  const approve = async (r) => {
    setProcessing(r.id)
    try {
      await updateDoc(doc(db, 'communities', communityId), { members: arrayUnion(r.userId) })
      await updateDoc(doc(db, 'joinRequests', r.id), { status: 'approved', approvedAt: new Date() })
      
      // Enviar notificação de aprovação
      try {
        const notifRef = collection(db, 'notifications', r.userId, 'items')
        await addDoc(notifRef, {
          type: 'community_approved',
          message: 'O teu pedido para entrar na comunidade foi aprovado! 🎉',
          timestamp: serverTimestamp(),
          read: false,
          link: `/communities/${communityId}`
        })
        sendPushNotification(r.userId, 'Pedido aprovado', 'O teu pedido para entrar na comunidade foi aprovado!')
      } catch (e) {
        console.debug('notification send error', e)
      }
      
      toast.success('Pedido aprovado')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao aprovar')
    } finally {
      setProcessing(null)
    }
  }

  const reject = async (r) => {
    setProcessing(r.id)
    try {
      await updateDoc(doc(db, 'joinRequests', r.id), { status: 'rejected', decidedAt: new Date() })
      
      // Enviar notificação de rejeição
      try {
        const notifRef = collection(db, 'notifications', r.userId, 'items')
        await addDoc(notifRef, {
          type: 'community_rejected',
          message: 'O teu pedido para entrar na comunidade foi rejeitado.',
          timestamp: serverTimestamp(),
          read: false
        })
      } catch (e) {
        console.debug('notification send error', e)
      }
      
      toast('Pedido rejeitado', { icon: '🗑️' })
    } catch (e) {
      console.error(e)
      toast.error('Erro ao rejeitar')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="text-purple-600" size={20} />
            <h2 className="font-bold">Pedidos de Entrada</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full"><X size={18} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Carregando...</div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center text-gray-400">Sem pedidos pendentes</div>
          ) : (
            <div className="divide-y">
              {requests.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                      {r.userPhoto ? <img src={r.userPhoto} alt={r.userName} className="w-full h-full object-cover"/> : <span className="text-sm font-semibold">{(r.userName||'U').charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{r.userName}</p>
                      {r.timestamp?.toDate && (
                        <p className="text-xs text-gray-500">{r.timestamp.toDate().toLocaleString('pt-PT')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => approve(r)} disabled={processing===r.id} className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm inline-flex items-center gap-1">
                      {processing===r.id ? <Clock size={14} className="animate-spin"/> : <Check size={14}/>} Aprovar
                    </button>
                    <button onClick={() => reject(r)} disabled={processing===r.id} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 text-sm inline-flex items-center gap-1">
                      <XCircle size={14}/> Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
