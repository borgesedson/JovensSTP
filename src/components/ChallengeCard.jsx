import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, ArrowRight, Award } from 'lucide-react';
import { getActiveChallenge, completeChallenge } from '../services/challenges';
import toast from 'react-hot-toast';

export default function ChallengeCard({ userId }) {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      loadChallenge();
    }
  }, [userId]);

  const loadChallenge = async () => {
    setLoading(true);
    const data = await getActiveChallenge(userId);
    setChallenge(data);
    setLoading(false);
  };

  const handleAction = () => {
    if (challenge.actionUrl) {
      navigate(challenge.actionUrl);
    }
  };

  const handleComplete = async () => {
    if (challenge.status === 'completed') return;
    
    toast.loading('A validar desafio...', { id: 'challenge' });
    const result = await completeChallenge(challenge.id, userId, challenge.xp);
    
    if (result.success) {
      toast.success(`Parabéns! Ganhaste ${challenge.xp} XP! 🎯`, { id: 'challenge' });
      setChallenge({ ...challenge, status: 'completed' });
    } else {
      toast.error('Erro ao completar desafio.', { id: 'challenge' });
    }
  };

  if (loading) return (
    <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl animate-pulse border border-indigo-50">
      <div className="h-4 w-24 bg-indigo-100 rounded mb-4" />
      <div className="h-6 w-48 bg-gray-100 rounded" />
    </div>
  );

  if (!challenge) return null;

  const isCompleted = challenge.status === 'completed';

  return (
    <div className={`relative overflow-hidden p-6 rounded-3xl transition-all duration-500 border-2 ${
      isCompleted 
        ? 'bg-green-50 border-green-100' 
        : 'bg-white border-indigo-100 shadow-xl shadow-indigo-50 hover:border-indigo-300'
    }`}>
      {/* Decorative background circle */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 ${
        isCompleted ? 'bg-green-500' : 'bg-indigo-600'
      }`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            isCompleted ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {isCompleted ? <CheckCircle size={12} /> : <Zap size={12} fill="currentColor" />}
            {isCompleted ? 'Desafio Concluído' : 'Desafio Relâmpago'}
          </div>
          <div className="text-xs font-bold text-gray-400">
            +{challenge.xp} XP
          </div>
        </div>

        <h3 className={`text-xl font-black mb-1 uppercase tracking-tight ${
          isCompleted ? 'text-green-800' : 'text-indigo-950'
        }`}>
          {challenge.title}
        </h3>
        <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6 line-clamp-2">
          {challenge.description}
        </p>

        {!isCompleted ? (
          <div className="flex gap-2">
            <button
              onClick={handleAction}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
              Fazer Agora <ArrowRight size={14} />
            </button>
            <button
              onClick={handleComplete}
              className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors"
              title="Marcar como concluído"
            >
              <CheckCircle size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-green-600 font-black text-xs uppercase tracking-widest">
            <Award size={20} /> Bom trabalho, Jovem! Próximo desafio em breve.
          </div>
        )}
      </div>
    </div>
  );
}
