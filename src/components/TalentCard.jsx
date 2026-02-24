import { MapPin, MessageCircle, Star, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStreamChat } from '../hooks/useStreamChat';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatEducation, formatSkills } from '../utils/formatters';

const TalentCard = ({ talent, onInvite }) => {
  const navigate = useNavigate();
  const { createChannel } = useStreamChat();
  const [loading, setLoading] = useState(false);

  const handleInviteToChat = async () => {
    setLoading(true);
    try {
      const channelId = await createChannel(talent.uid, talent.name);
      toast.success('A abrir conversa...');
      navigate(`/chat?channel=${channelId}`);
      
      if (onInvite) {
        onInvite(talent.uid);
      }
    } catch (error) {
      console.error('Erro ao criar canal:', error);
      toast.error('Erro ao criar conversa');
    } finally {
      setLoading(false);
    }
  };

  const experienceLevelLabels = {
    estagiario: 'Estagiário',
    junior: 'Júnior',
    pleno: 'Pleno',
    senior: 'Sénior'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <img
          src={talent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(talent.name)}&background=6366f1&color=fff`}
          alt={talent.name}
          className="w-20 h-20 rounded-full object-cover flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-lg truncate">{talent.name}</h3>
            {talent.verified && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>

          {talent.bio && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{talent.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-2">
            {talent.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>{talent.location}</span>
              </div>
            )}
            
            {talent.experienceLevel && (
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">
                {experienceLevelLabels[talent.experienceLevel] || talent.experienceLevel}
              </span>
            )}

            {talent.openToRemote && (
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                Aberto a remoto
              </span>
            )}
          </div>

          {(() => {
            const skillsArray = formatSkills(talent.skills);
            return skillsArray.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {skillsArray.slice(0, 5).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {skillsArray.length > 5 && (
                  <span className="px-3 py-1 text-gray-500 text-xs font-medium">
                    +{skillsArray.length - 5} skills
                  </span>
                )}
              </div>
            );
          })()}

          {talent.education && formatEducation(talent.education) && (
            <p className="text-xs text-gray-600 mt-2">
              🎓 {formatEducation(talent.education)}
            </p>
          )}

          {talent.matchReasons && talent.matchReasons.length > 0 && (
            <div className="mt-3 p-3 bg-indigo-50 rounded-lg">
              <p className="text-xs font-medium text-indigo-900 mb-1">Por que este talento?</p>
              <div className="space-y-1">
                {talent.matchReasons.map((reason, idx) => (
                  <p key={idx} className="text-xs text-indigo-700 flex items-start gap-1">
                    <span className="mt-0.5">✓</span>
                    <span>{reason}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleInviteToChat}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageCircle className="w-4 h-4" />
          {loading ? 'A criar...' : 'Convidar para conversar'}
        </button>
        
        <button
          onClick={() => navigate(`/profile/${talent.uid}`)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Ver perfil
        </button>
      </div>
    </div>
  );
};

export default TalentCard;
