import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Home, Briefcase, Users, MessageCircle, User } from 'lucide-react'

const ONBOARDING_STEPS = [
  {
    title: 'Bem-vindo ao JovensSTP! 🎉',
    description: 'A plataforma que conecta jovens profissionais a oportunidades em São Tomé e Príncipe.',
    icon: Home,
    color: 'text-green-600'
  },
  {
    title: 'Descobre Oportunidades 💼',
    description: 'Explora vagas de emprego e estágios. Candidata-te com um clique e acompanha o status das tuas candidaturas.',
    icon: Briefcase,
    color: 'text-blue-600'
  },
  {
    title: 'Constrói a Tua Rede 🤝',
    description: 'Conecta-te com outros jovens e empresas. Segue perfis interessantes e expande a tua rede profissional.',
    icon: User,
    color: 'text-purple-600'
  },
  {
    title: 'Participa em Comunidades 👥',
    description: 'Junta-te a comunidades temáticas, partilha conhecimento e discute tópicos relevantes com a comunidade.',
    icon: Users,
    color: 'text-yellow-600'
  },
  {
    title: 'Conversa Diretamente 💬',
    description: 'Envia mensagens para as tuas conexões e empresas. Networking direto e eficaz.',
    icon: MessageCircle,
    color: 'text-pink-600'
  }
]

export const OnboardingModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)

  if (!isOpen) return null

  const CurrentIcon = ONBOARDING_STEPS[currentStep].icon
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onClose()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-green-400 to-green-600 p-6 text-white">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition"
          >
            <X size={20} />
          </button>
          <div className="flex flex-col items-center text-center pt-4">
            <div className={`w-20 h-20 bg-white/90 rounded-full flex items-center justify-center mb-4 ${ONBOARDING_STEPS[currentStep].color}`}>
              <CurrentIcon size={40} strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">{ONBOARDING_STEPS[currentStep].title}</h2>
            <p className="text-white/90 text-sm leading-relaxed">{ONBOARDING_STEPS[currentStep].description}</p>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 py-4 bg-gray-50">
          {ONBOARDING_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep 
                  ? 'bg-green-600 w-6' 
                  : idx < currentStep 
                    ? 'bg-green-300' 
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="p-6 flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Anterior</span>
          </button>

          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Pular
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium transition"
          >
            <span className="text-sm">{isLastStep ? 'Começar' : 'Próximo'}</span>
            {!isLastStep && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
