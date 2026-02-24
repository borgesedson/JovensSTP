import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import { auth } from '../services/firebase'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [oobCode, setOobCode] = useState(null)

  useEffect(() => {
    const code = searchParams.get('oobCode')
    const mode = searchParams.get('mode')

    if (mode !== 'resetPassword' || !code) {
      setError('Link inválido ou expirado')
      setLoading(false)
      return
    }

    // Verify the code is valid
    verifyPasswordResetCode(auth, code)
      .then((emailFromCode) => {
        setEmail(emailFromCode)
        setOobCode(code)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Verify reset code error:', err)
        setError('Link inválido ou expirado. Por favor, solicite um novo link.')
        setLoading(false)
      })
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    try {
      setVerifying(true)
      await confirmPasswordReset(auth, oobCode, newPassword)
      toast.success('Senha alterada com sucesso!')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      console.error('Reset password error:', err)
      toast.error('Erro ao redefinir senha. Por favor, tente novamente.')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando link...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-green-600">Jovens</span>
              <span className="text-yellow-500">STP</span>
            </h1>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Link Inválido</h2>
            <p className="text-red-700">{error}</p>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-green-600">Jovens</span>
            <span className="text-yellow-500">STP</span>
          </h1>
          <p className="text-gray-600">Redefinir Senha</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">
            <strong>Email:</strong> {email}
          </p>
          <p className="text-xs text-green-700 mt-2">
            Escolha uma nova senha forte para a tua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Digite novamente"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            {verifying ? 'Alterando...' : 'Redefinir Senha'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-green-600 hover:underline"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    </div>
  )
}
