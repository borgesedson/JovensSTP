import { useState } from 'react'
import { AlertCircle, X, Mail } from 'lucide-react'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../services/firebase'
import toast from 'react-hot-toast'

export const EmailVerificationBanner = () => {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  if (dismissed) return null

  const handleResend = async () => {
    if (!auth.currentUser) return
    setSending(true)
    try {
      await sendEmailVerification(auth.currentUser)
      toast.success('Email de verificação enviado! Verifica a tua caixa de entrada.')
    } catch (error) {
      toast.error('Erro ao enviar email. Tenta novamente mais tarde.')
      console.error(error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-start gap-3">
        <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-yellow-900">
            Email não verificado
          </p>
          <p className="text-xs text-yellow-700 mt-0.5">
            Verifica o teu email para desbloquear todas as funcionalidades.{' '}
            <button
              onClick={handleResend}
              disabled={sending}
              className="underline font-medium hover:text-yellow-900 disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Reenviar email'}
            </button>
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-yellow-100 rounded-lg transition flex-shrink-0"
        >
          <X size={16} className="text-yellow-600" />
        </button>
      </div>
    </div>
  )
}
