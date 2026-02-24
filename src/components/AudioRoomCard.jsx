import { Users, Mic } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AudioRoomCard = ({ room, onJoin }) => {
  const participantCount = room.participants?.length || 0;
  const speakerCount = room.speakerIds?.length || 0;
  const hostName = room.hostName || (room.participants || []).find(p => p.uid === room.hostId)?.name || 'Host';
  
  const timeAgo = room.startedAt
    ? formatDistanceToNow(room.startedAt.toDate(), { 
        addSuffix: true,
        locale: ptBR 
      })
    : 'agora';

  return (
    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wide">AO VIVO</span>
          </div>
          <h3 className="font-bold text-lg mb-1">{room.title}</h3>
          <p className="text-xs text-green-100 mb-1">Host: <span className="font-semibold text-white/90">{hostName}</span></p>
          {room.description && (
            <p className="text-sm text-green-50 line-clamp-2">{room.description}</p>
          )}
        </div>
        
        <button
          onClick={() => onJoin(room)}
          className="bg-white text-green-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-green-50 transition flex items-center gap-2 shadow-md ml-3"
        >
          <Mic size={16} />
          Entrar
        </button>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-green-400">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Mic size={16} className="text-green-100" />
            <span className="font-medium">{speakerCount}</span>
            <span className="text-green-100">a falar</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-green-100" />
            <span className="font-medium">{participantCount - speakerCount}</span>
            <span className="text-green-100">
              {(participantCount - speakerCount) === 1 ? 'ouvinte' : 'ouvintes'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-green-100">{timeAgo}</span>
        </div>
      </div>

      {/* Avatares dos participantes */}
      {room.participants && room.participants.length > 0 && (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex -space-x-2">
            {room.participants.slice(0, 5).map((p, idx) => (
              <div key={idx} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-green-700">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                    {p.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
          {participantCount > 5 && (
            <span className="text-sm text-green-100 font-medium">
              +{participantCount - 5}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
