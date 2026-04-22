import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login, resetPassword } = useAuth()
  const location = useLocation()
  const { register, handleSubmit, formState: { errors } } = useForm()
  
  const from = location.state?.from || '/home'
  const [loading, setLoading] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      await login(data.email, data.password)
      toast.success('Login realizado com sucesso!')
      navigate(from, { replace: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      toast.error('Digite seu email')
      return
    }
    try {
      setResetLoading(true)
      await resetPassword(resetEmail)
      toast.success('Email de recuperação enviado! Verifica a tua caixa de entrada.')
      setShowResetModal(false)
      setResetEmail('')
    } catch (err) {
      if (err?.code === 'auth/unauthorized-continue-uri') {
        toast.error('Domínio do link não autorizado no Firebase Auth. Usa o domínio padrão (web.app/firebaseapp.com) ou autoriza o teu domínio nas definições.')
      } else if (err?.code === 'auth/user-not-found') {
        toast.error('Não existe conta com este email.')
      } else if (err?.code === 'auth/invalid-email') {
        toast.error('Email inválido.')
      } else {
        toast.error(err?.message || 'Erro ao enviar email de recuperação')
      }
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-green-600">Jovens</span>
            <span className="text-yellow-500">STP</span>
          </h1>
          <p className="text-gray-600">Conecte-se com oportunidades</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              {...register('email', { required: 'Email é obrigatório' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <span className="text-sm text-red-500">{errors.email.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              {...register('password', { required: 'Senha é obrigatória' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <span className="text-sm text-red-500">{errors.password.message}</span>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-sm text-green-600 hover:underline"
            >
              Esqueceu a senha?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Não tem conta?{' '}
            <Link to="/signup" state={location.state} className="text-green-600 font-medium hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>

      {/* Modal Recuperar Senha */}
      {showResetModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Recuperar Senha</h2>
            <p className="text-sm text-gray-600 mb-4">
              Digite o teu email e enviaremos um link para redefinir a senha.
            </p>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="seu@email.com"
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
                >
                  {resetLoading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
