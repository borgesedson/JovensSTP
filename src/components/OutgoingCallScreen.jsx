import { X, Phone, Video } from 'lucide-react'

export const OutgoingCallScreen = ({ targetUser, callType, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-green-600 to-green-800 text-white flex flex-col items-center justify-center">
      {/* Avatar e nome do destinatário */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-white/30 shadow-2xl">
          {targetUser?.photoURL ? (
            <img 
              src={targetUser.photoURL} 
              alt={targetUser.displayName || 'Usuário'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
              <span className="text-5xl font-bold">
                {(targetUser?.displayName || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        <h2 className="text-3xl font-bold mb-2">
          {targetUser?.displayName || 'Utilizador'}
        </h2>
        <p className="text-lg text-white/80 mb-6">
          Ligando...
        </p>
        
        {/* Animação de loading */}
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      {/* Ícone de tipo de chamada */}
      <div className="mb-12 w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
        {callType === 'audio' ? (
          <Phone size={40} className="text-white" />
        ) : (
          <Video size={40} className="text-white" />
        )}
      </div>

      {/* Botão de cancelar */}
      <button
        onClick={onCancel}
        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
        title="Cancelar chamada"
      >
        <X size={32} />
      </button>

      <p className="mt-6 text-sm text-white/60">Toca para cancelar</p>
    </div>
  )
}
