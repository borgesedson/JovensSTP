import { Phone, PhoneOff, Video } from 'lucide-react'

export const IncomingCallScreen = ({ callerUser, callType, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-600 to-blue-800 text-white flex flex-col items-center justify-center">
      {/* Avatar e nome de quem está ligando */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-white/30 shadow-2xl animate-pulse">
          {callerUser?.photoURL ? (
            <img 
              src={callerUser.photoURL} 
              alt={callerUser.displayName || 'Usuário'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
              <span className="text-5xl font-bold">
                {(callerUser?.displayName || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        <h2 className="text-3xl font-bold mb-2">
          {callerUser?.displayName || 'Utilizador'}
        </h2>
        <p className="text-lg text-white/80 mb-2">
          {callType === 'audio' ? 'Chamada de áudio...' : 'Chamada de vídeo...'}
        </p>
        
        {/* Badge de tipo de chamada */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
          {callType === 'audio' ? (
            <Phone size={18} />
          ) : (
            <Video size={18} />
          )}
          <span className="text-sm font-semibold">
            {callType === 'audio' ? 'Áudio' : 'Vídeo'}
          </span>
        </div>
      </div>

      {/* Texto de chamada recebida */}
      <p className="text-xl mb-12 animate-pulse">A ligar...</p>

      {/* Botões de ação */}
      <div className="flex gap-8 items-center">
        {/* Rejeitar */}
        <button
          onClick={onReject}
          className="flex flex-col items-center gap-3 group"
        >
          <div className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 group-hover:rotate-12">
            <PhoneOff size={36} />
          </div>
          <span className="text-sm font-semibold">Recusar</span>
        </button>

        {/* Aceitar */}
        <button
          onClick={onAccept}
          className="flex flex-col items-center gap-3 group"
        >
          <div className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-110 group-hover:-rotate-12 animate-pulse">
            <Phone size={36} />
          </div>
          <span className="text-sm font-semibold">Atender</span>
        </button>
      </div>

      {/* Toque de chamada (visual feedback) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  )
}
