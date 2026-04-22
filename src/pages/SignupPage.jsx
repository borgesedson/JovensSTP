import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export const SignupPage = () => {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const location = useLocation()
  const from = location.state?.from || '/home'
  const { register, handleSubmit, formState: { errors }, watch, control } = useForm()
  const [experiences, setExperiences] = useState([{ company: '', role: '', startYear: '', endYear: '', description: '' }])
  const [educations, setEducations] = useState([{ institution: '', degree: '', startYear: '', endYear: '' }])
  const [skills, setSkills] = useState('')
  const [socials, setSocials] = useState({ linkedin: '', instagram: '' })
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState('young')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const password = watch('password')

  const onSubmit = async (data) => {
    if (!acceptedTerms) {
      toast.error('Deves aceitar os Termos de Uso e Política de Privacidade')
      return
    }

    try {
      setLoading(true)

      // Build extended profile data based on user type
      const profileData = {
        displayName: data.displayName,
        location: data.location || '',
        bio: data.bio || '',
      }

      if (userType === 'young') {
        profileData.education = educations
        profileData.experience = experiences
        profileData.skills = skills
        profileData.socials = socials
      } else {
        profileData.company = data.company || ''
        profileData.sector = data.sector || ''
        profileData.companySize = data.companySize || ''
        profileData.website = data.website || ''
      }

      await signup(data.email, data.password, profileData, userType)
      toast.success('Cadastro realizado com sucesso!')
      navigate(from, { replace: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
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
          <p className="text-gray-600">Crie sua conta</p>
        </div>

        {/* User Type Selection */}
        <div className="mb-6 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setUserType('young')}
            className={`py-3 px-2 rounded-lg font-medium transition text-sm ${userType === 'young'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Jovens
          </button>
          <button
            type="button"
            onClick={() => setUserType('teacher')}
            className={`py-3 px-2 rounded-lg font-medium transition text-sm ${userType === 'teacher'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Professor
          </button>
          <button
            type="button"
            onClick={() => setUserType('company')}
            className={`py-3 px-2 rounded-lg font-medium transition text-sm ${userType === 'company'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Empresa
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Campos para Empresa */}
          {userType === 'company' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                <input
                  type="text"
                  {...register('company', { required: 'Nome da empresa é obrigatório' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nome da sua empresa"
                />
                {errors.company && (
                  <span className="text-sm text-red-500">{errors.company.message}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                <select {...register('sector')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Selecione o setor</option>
                  <option value="tecnologia">Tecnologia</option>
                  <option value="educacao">Educação</option>
                  <option value="saude">Saúde</option>
                  <option value="turismo">Turismo</option>
                  <option value="agricultura">Agricultura</option>
                  <option value="comercio">Comércio</option>
                  <option value="servicos">Serviços</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho da Empresa</label>
                <select {...register('companySize')} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Selecione o tamanho</option>
                  <option value="1-10">1-10 funcionários</option>
                  <option value="11-50">11-50 funcionários</option>
                  <option value="51-200">51-200 funcionários</option>
                  <option value="201+">201+ funcionários</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  {...register('displayName', { required: 'Nome é obrigatório' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Seu nome"
                />
                {errors.displayName && (
                  <span className="text-sm text-red-500">{errors.displayName.message}</span>
                )}
              </div>
            </>
          )}

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
              {...register('password', {
                required: 'Senha é obrigatória',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <span className="text-sm text-red-500">{errors.password.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Senha
            </label>
            <input
              type="password"
              {...register('confirmPassword', {
                required: 'Confirmação de senha obrigatória',
                validate: (value) => value === password || 'Senhas não correspondem',
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <span className="text-sm text-red-500">{errors.confirmPassword.message}</span>
            )}
          </div>

          {/* Conditional Fields based on User Type */}
          {(userType === 'young' || userType === 'teacher') && (
            <>
              {/* Educação */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {userType === 'teacher' ? 'Formação/Experiência Académica' : 'Educação'}
                </label>
                {educations.map((edu, idx) => (
                  <div key={idx} className="mb-2 border rounded-lg p-3 bg-gray-50">
                    <input type="text" value={edu.institution} onChange={e => {
                      const arr = [...educations]; arr[idx].institution = e.target.value; setEducations(arr)
                    }} className="mb-1 w-full px-2 py-1 border rounded" placeholder="Instituição" />
                    <input type="text" value={edu.degree} onChange={e => {
                      const arr = [...educations]; arr[idx].degree = e.target.value; setEducations(arr)
                    }} className="mb-1 w-full px-2 py-1 border rounded" placeholder="Curso/Graduação" />
                    <div className="flex gap-2">
                      <input type="text" value={edu.startYear} onChange={e => {
                        const arr = [...educations]; arr[idx].startYear = e.target.value; setEducations(arr)
                      }} className="mb-1 w-1/2 px-2 py-1 border rounded" placeholder="Ano início" />
                      <input type="text" value={edu.endYear} onChange={e => {
                        const arr = [...educations]; arr[idx].endYear = e.target.value; setEducations(arr)
                      }} className="mb-1 w-1/2 px-2 py-1 border rounded" placeholder="Ano fim" />
                    </div>
                    <button type="button" className="text-xs text-red-500 mt-1" onClick={() => setEducations(educations.filter((_, i) => i !== idx))}>Remover</button>
                  </div>
                ))}
                <button type="button" className="text-green-600 font-medium" onClick={() => setEducations([...educations, { institution: '', degree: '', startYear: '', endYear: '' }])}>+ Adicionar formação</button>
              </div>

              {/* Experiência */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Experiência Profissional</label>
                {experiences.map((exp, idx) => (
                  <div key={idx} className="mb-2 border rounded-lg p-3 bg-gray-50">
                    <input type="text" value={exp.company} onChange={e => {
                      const arr = [...experiences]; arr[idx].company = e.target.value; setExperiences(arr)
                    }} className="mb-1 w-full px-2 py-1 border rounded" placeholder="Empresa" />
                    <input type="text" value={exp.role} onChange={e => {
                      const arr = [...experiences]; arr[idx].role = e.target.value; setExperiences(arr)
                    }} className="mb-1 w-full px-2 py-1 border rounded" placeholder="Cargo" />
                    <input type="text" value={exp.description} onChange={e => {
                      const arr = [...experiences]; arr[idx].description = e.target.value; setExperiences(arr)
                    }} className="mb-1 w-full px-2 py-1 border rounded" placeholder="Descrição das atividades" />
                    <div className="flex gap-2">
                      <input type="text" value={exp.startYear} onChange={e => {
                        const arr = [...experiences]; arr[idx].startYear = e.target.value; setExperiences(arr)
                      }} className="mb-1 w-1/2 px-2 py-1 border rounded" placeholder="Ano início" />
                      <input type="text" value={exp.endYear} onChange={e => {
                        const arr = [...experiences]; arr[idx].endYear = e.target.value; setExperiences(arr)
                      }} className="mb-1 w-1/2 px-2 py-1 border rounded" placeholder="Ano fim" />
                    </div>
                    <button type="button" className="text-xs text-red-500 mt-1" onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}>Remover</button>
                  </div>
                ))}
                <button type="button" className="text-green-600 font-medium" onClick={() => setExperiences([...experiences, { company: '', role: '', startYear: '', endYear: '', description: '' }])}>+ Adicionar experiência</button>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Habilidades</label>
                <input type="text" value={skills} onChange={e => setSkills(e.target.value)} className="w-full px-2 py-1 border rounded" placeholder="Ex: React, Design, Marketing" />
              </div>

              {/* Redes sociais */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Redes Sociais</label>
                <input type="url" value={socials.linkedin} onChange={e => setSocials({ ...socials, linkedin: e.target.value })} className="mb-1 w-full px-2 py-1 border rounded" placeholder="LinkedIn (opcional)" />
                <input type="url" value={socials.instagram} onChange={e => setSocials({ ...socials, instagram: e.target.value })} className="mb-1 w-full px-2 py-1 border rounded" placeholder="Instagram (opcional)" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Localização
            </label>
            <input
              type="text"
              {...register('location')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex: São Tomé, Príncipe"
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio (opcional)
            </label>
            <textarea
              {...register('bio')}
              rows="2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Fale um pouco sobre você ou sua empresa..."
            />
          </div>

          {/* Website e redes sociais agora depois da bio */}
          {userType === 'company' && (
            <>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Website <span className="text-gray-400">(opcional)</span></label>
                <input
                  type="url"
                  {...register('website')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://suaempresa.com"
                />
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Redes Sociais <span className="text-gray-400">(opcional)</span></label>
                <input
                  type="url"
                  {...register('linkedin')}
                  className="mb-1 w-full px-2 py-1 border rounded"
                  placeholder="LinkedIn (opcional)"
                />
                <input
                  type="url"
                  {...register('instagram')}
                  className="mb-1 w-full px-2 py-1 border rounded"
                  placeholder="Instagram (opcional)"
                />
                <input
                  type="url"
                  {...register('facebook')}
                  className="mb-1 w-full px-2 py-1 border rounded"
                  placeholder="Facebook (opcional)"
                />
              </div>
            </>
          )}

          {/* Terms & Privacy */}
          <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              Aceito os{' '}
              <Link to="/terms" target="_blank" className="text-green-600 hover:underline font-medium">
                Termos de Uso
              </Link>
              {' '}e{' '}
              <Link to="/privacy" target="_blank" className="text-green-600 hover:underline font-medium">
                Política de Privacidade
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Já tem conta?{' '}
            <Link to="/login" state={location.state} className="text-green-600 font-medium hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
