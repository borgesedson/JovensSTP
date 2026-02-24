import { useEffect, useState } from 'react'
import { X, Camera, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../services/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { uploadUserAvatar } from '../services/storage'
import toast from 'react-hot-toast'
import { Guardian } from '../utils/securityUtils'

export const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, userType } = useAuth()
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(user?.photoURL || null)
  const [avatarFile, setAvatarFile] = useState(null)

  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    location: user?.location || '',
    company: user?.company || (userType === 'company' ? (user?.displayName || '') : ''),
    website: user?.website || '',
    phone: user?.phone || '',
    sector: user?.sector || '',
    companySize: user?.companySize || '',
    openToMessages: !!user?.openToMessages,
    skills: Array.isArray(user?.skills) ? user.skills : (user?.skills ? String(user.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
    socials: {
      linkedin: user?.socials?.linkedin || '',
      github: user?.socials?.github || '',
      instagram: user?.socials?.instagram || ''
    },
    education: Array.isArray(user?.education) ? user.education : [],
    experience: Array.isArray(user?.experience) ? user.experience : []
  })

  useEffect(() => {
    if (!isOpen) return
    setAvatarPreview(user?.photoURL || null)
    setAvatarFile(null)
    setForm({
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      location: user?.location || '',
      company: user?.company || (userType === 'company' ? (user?.displayName || '') : ''),
      website: user?.website || '',
      phone: user?.phone || '',
      sector: user?.sector || '',
      companySize: user?.companySize || '',
      openToMessages: !!user?.openToMessages,
      skills: Array.isArray(user?.skills) ? user.skills : (user?.skills ? String(user.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
      socials: {
        linkedin: user?.socials?.linkedin || '',
        github: user?.socials?.github || '',
        instagram: user?.socials?.instagram || ''
      },
      education: Array.isArray(user?.education) ? user.education : [],
      experience: Array.isArray(user?.experience) ? user.experience : []
    })
  }, [isOpen, user, userType])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 2MB)')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const addEducation = () => {
    setForm((f) => ({
      ...f,
      education: [
        ...f.education,
        { institution: '', degree: '', startYear: '', endYear: '' }
      ]
    }))
  }

  const updateEducation = (idx, field, value) => {
    setForm((f) => {
      const next = [...f.education]
      next[idx] = { ...next[idx], [field]: value }
      return { ...f, education: next }
    })
  }

  const removeEducation = (idx) => {
    setForm((f) => ({
      ...f,
      education: f.education.filter((_, i) => i !== idx)
    }))
  }

  const addExperience = () => {
    setForm((f) => ({
      ...f,
      experience: [
        ...f.experience,
        { company: '', role: '', startYear: '', endYear: '', description: '' }
      ]
    }))
  }

  const updateExperience = (idx, field, value) => {
    setForm((f) => {
      const next = [...f.experience]
      next[idx] = { ...next[idx], [field]: value }
      return { ...f, experience: next }
    })
  }

  const removeExperience = (idx) => {
    setForm((f) => ({
      ...f,
      experience: f.experience.filter((_, i) => i !== idx)
    }))
  }

  const addSkill = (value) => {
    const v = value.trim()
    if (!v) return
    setForm((f) => ({ ...f, skills: Array.from(new Set([...(f.skills || []), v])) }))
  }

  const removeSkill = (s) => setForm((f) => ({ ...f, skills: (f.skills || []).filter((x) => x !== s) }))

  const handleSave = async () => {
    if (!user) return

    const name = (form.displayName || '').trim()
    const companyName = (form.company || '').trim()
    if (userType === 'company') {
      if (companyName.length === 0) {
        toast.error('Coloca o nome da empresa')
        return
      }
      if (companyName.length > 80) {
        toast.error('Nome da empresa muito longo')
        return
      }
    } else {
      if (name.length === 0) {
        toast.error('Coloca um nome')
        return
      }
      if (name.length > 60) {
        toast.error('Nome muito longo')
        return
      }
    }

    // Guardian Security Checks
    const fieldsToVerify = [
      { name: 'Nome', value: name },
      { name: 'Nome da Empresa', value: companyName },
      { name: 'Bio', value: form.bio },
      { name: 'Localização', value: form.location }
    ];

    for (const field of fieldsToVerify) {
      if (field.value) {
        const check = Guardian.validateText(field.value);
        if (!check.clean) {
          toast.error(`⚠️ Conteúdo impróprio detetado no campo ${field.name}!`);
          return;
        }
      }
    }

    // Validate years for education and experience (optional/empty allowed)
    const isValidYear = (y) => {
      if (y === undefined || y === null || String(y).trim() === '') return true
      const n = parseInt(String(y), 10)
      return !Number.isNaN(n) && n >= 1900 && n <= 2100
    }
    const parseYear = (y) => {
      if (y === undefined || y === null || String(y).trim() === '') return ''
      return String(parseInt(String(y), 10))
    }
    if (userType === 'young') {
      for (const ed of form.education || []) {
        if (!isValidYear(ed.startYear) || !isValidYear(ed.endYear)) {
          toast.error('Anos de educação inválidos (use 1900-2100)')
          return
        }
        const s = parseInt(ed.startYear || 0, 10)
        const e = ed.endYear ? parseInt(ed.endYear, 10) : s
        if (ed.endYear && !Number.isNaN(s) && !Number.isNaN(e) && e < s) {
          toast.error('Ano de fim na educação não pode ser menor que o início')
          return
        }
      }
      for (const ex of form.experience || []) {
        if (!isValidYear(ex.startYear) || !isValidYear(ex.endYear)) {
          toast.error('Anos de experiência inválidos (use 1900-2100)')
          return
        }
        const s = parseInt(ex.startYear || 0, 10)
        const e = ex.endYear ? parseInt(ex.endYear, 10) : s
        if (ex.endYear && !Number.isNaN(s) && !Number.isNaN(e) && e < s) {
          toast.error('Ano de fim na experiência não pode ser menor que o início')
          return
        }
      }
    }

    const normalizeUrl = (u) => {
      const v = (u || '').trim()
      if (!v) return ''
      if (/^https?:\/\//i.test(v)) return v
      return `https://${v}`
    }

    setSaving(true)
    try {
      const updates = {
        // displayName will be assigned differently for company
        bio: (form.bio || '').trim(),
        location: (form.location || '').trim(),
        socials: {
          linkedin: normalizeUrl(form.socials.linkedin),
          github: normalizeUrl(form.socials.github),
          instagram: normalizeUrl(form.socials.instagram),
        },
      }

      if (Array.isArray(form.skills)) updates.skills = form.skills

      if (userType === 'young') {
        updates.displayName = name
        updates.openToMessages = !!form.openToMessages
        if (Array.isArray(form.education)) {
          updates.education = form.education.map((ed) => ({
            institution: (ed.institution || '').trim(),
            degree: (ed.degree || '').trim(),
            startYear: parseYear(ed.startYear),
            endYear: parseYear(ed.endYear),
          }))
        }
        if (Array.isArray(form.experience)) {
          updates.experience = form.experience.map((ex) => ({
            company: (ex.company || '').trim(),
            role: (ex.role || '').trim(),
            startYear: parseYear(ex.startYear),
            endYear: parseYear(ex.endYear),
            description: (ex.description || '').trim(),
          }))
        }
      } else if (userType === 'company') {
        const comp = companyName
        updates.displayName = comp
        updates.company = comp
        updates.website = normalizeUrl(form.website)
        updates.phone = (form.phone || '').trim()
        updates.sector = (form.sector || '').trim()
        updates.companySize = (form.companySize || '').trim()
      }

      // Upload avatar first if changed
      if (avatarFile) {
        try {
          const url = await uploadUserAvatar(user.uid, avatarFile)
          updates.photoURL = url
        } catch (e) {
          console.error('Falha ao enviar avatar:', e)
          toast.error('Não foi possível enviar a imagem do perfil')
        }
      }

      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, updates)

      toast.success('Perfil atualizado!')
      onClose?.()
    } catch (e) {
      console.error('Erro ao salvar perfil', e)
      toast.error('Não foi possível salvar o perfil')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl sm:shadow-xl h-[100svh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Editar perfil</h3>
            <p className="text-xs text-gray-500">Deixa teu perfil mais completo ✨</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-semibold">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-24">
          {/* Avatar */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Foto de perfil</p>
            <div className="flex items-center gap-4">
              {avatarPreview || user?.photoURL ? (
                <img src={avatarPreview || user?.photoURL} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  {(user?.displayName || 'VS').slice(0, 2).toUpperCase()}
                </div>
              )}
              <label className="px-3 py-2 rounded-lg border text-sm cursor-pointer hover:bg-gray-50">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <span className="inline-flex items-center gap-2"><Camera size={16} /> Trocar foto</span>
              </label>
            </div>
          </div>

          {/* Basics */}
          <div className="grid grid-cols-1 gap-3">
            {userType === 'company' ? (
              <div>
                <label className="text-xs text-gray-600">Nome da empresa</label>
                <input
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-600">Nome</label>
                <input
                  className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Teu nome"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-600">Localização</label>
              <input
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Cidade, País"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Bio</label>
              <textarea
                rows={3}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Fala um pouco sobre ti..."
              />
            </div>
          </div>

          {/* Young extras: Education + Skills */}
          {userType === 'young' && (
            <>
              {/* Open to messages toggle */}
              <div>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={!!form.openToMessages}
                    onChange={(e) => setForm((f) => ({ ...f, openToMessages: e.target.checked }))}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Aberto a mensagens</p>
                    <p className="text-xs text-gray-500">Permite receber mensagens de pessoas que ainda não são tuas conexões.</p>
                  </div>
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700">Educação</p>
                  <button onClick={addEducation} className="text-xs text-green-700 hover:text-green-800 inline-flex items-center gap-1">
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                {form.education.length === 0 ? (
                  <p className="text-xs text-gray-500">Sem itens de educação</p>
                ) : (
                  <div className="space-y-3">
                    {form.education.map((ed, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg">
                        <input
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Instituição"
                          value={ed.institution || ''}
                          onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                        />
                        <input
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Grau/Curso"
                          value={ed.degree || ''}
                          onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                        />
                        <input
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Início (ano)"
                          value={ed.startYear || ''}
                          onChange={(e) => updateEducation(idx, 'startYear', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <input
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            placeholder="Fim (ano)"
                            value={ed.endYear || ''}
                            onChange={(e) => updateEducation(idx, 'endYear', e.target.value)}
                          />
                          <button onClick={() => removeEducation(idx)} className="px-2 rounded-lg border text-red-600 hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 mt-4">
                  <p className="text-xs font-semibold text-gray-700">Experiência</p>
                  <button onClick={addExperience} className="text-xs text-green-700 hover:text-green-800 inline-flex items-center gap-1">
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                {form.experience.length === 0 ? (
                  <p className="text-xs text-gray-500">Sem experiências ainda</p>
                ) : (
                  <div className="space-y-3">
                    {form.experience.map((ex, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg">
                        <input
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Empresa"
                          value={ex.company || ''}
                          onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                        />
                        <input
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Cargo"
                          value={ex.role || ''}
                          onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                        />
                        <input
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Início (ano)"
                          value={ex.startYear || ''}
                          onChange={(e) => updateExperience(idx, 'startYear', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <input
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            placeholder="Fim (ano)"
                            value={ex.endYear || ''}
                            onChange={(e) => updateExperience(idx, 'endYear', e.target.value)}
                          />
                          <button onClick={() => removeExperience(idx)} className="px-2 rounded-lg border text-red-600 hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="sm:col-span-2">
                          <textarea
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="Descrição das atividades (opcional)"
                            rows={2}
                            value={ex.description || ''}
                            onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.skills || []).map((s) => (
                    <span key={s} className="px-2 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1">
                      {s}
                      <button onClick={() => removeSkill(s)} className="ml-1 text-green-700 hover:text-green-800">×</button>
                    </span>
                  ))}
                </div>
                <SkillAdder onAdd={addSkill} />
              </div>
            </>
          )}

          {/* Company extras */}
          {userType === 'company' && (
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Website</label>
                  <input
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Telefone</label>
                  <input
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(+239) 999-9999"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Setor</label>
                  <input
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={form.sector}
                    onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                    placeholder="Ex: Tecnologia"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Tamanho</label>
                  <input
                    className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={form.companySize}
                    onChange={(e) => setForm((f) => ({ ...f, companySize: e.target.value }))}
                    placeholder="Ex: 11-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Socials */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-gray-600">LinkedIn</label>
              <input
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.socials.linkedin}
                onChange={(e) => setForm((f) => ({ ...f, socials: { ...f.socials, linkedin: e.target.value } }))}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">GitHub</label>
              <input
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.socials.github}
                onChange={(e) => setForm((f) => ({ ...f, socials: { ...f.socials, github: e.target.value } }))}
                placeholder="https://github.com/usuario"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Instagram</label>
              <input
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.socials.instagram}
                onChange={(e) => setForm((f) => ({ ...f, socials: { ...f.socials, instagram: e.target.value } }))}
                placeholder="https://instagram.com/usuario"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 text-sm">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-semibold">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const SkillAdder = ({ onAdd }) => {
  const [value, setValue] = useState('')
  return (
    <div className="flex items-center gap-2">
      <input
        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Adicionar skill (pressiona Enter)"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onAdd?.(value)
            setValue('')
          }
        }}
      />
      <button
        onClick={() => { onAdd?.(value); setValue('') }}
        className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
      >
        Adicionar
      </button>
    </div>
  )
}

export default EditProfileModal
