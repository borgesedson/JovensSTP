import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle, ArrowRight, X, Award, Send } from 'lucide-react';
import { getActiveChallenge, completeChallenge } from '../services/challenges';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function ChallengePopup() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    checkChallenge();

    const interval = setInterval(() => {
      checkChallenge();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [user]);

  const checkChallenge = async () => {
    if (!user) return;
    
    try {
      const data = await getActiveChallenge(user.uid);
      if (data && data.status !== 'completed') {
        const lastShownId = localStorage.getItem('last_challenge_shown');
        if (lastShownId !== data.id) {
          setChallenge(data);
          setIsOpen(true);
          localStorage.setItem('last_challenge_shown', data.id);
        }
      }
    } catch (error) {
      console.error('Error checking challenge popup:', error);
    }
  };

  const closePopup = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Match transition duration
  };

  const [responseText, setResponseText] = useState('');
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!responseText.trim()) return;

    setSharing(true);
    toast.loading('A partilhar com a comunidade...', { id: 'challenge-share' });

    try {
      const { db } = await import('../services/firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      // 1. Criar o post no feed (Coleção stories)
      await addDoc(collection(db, 'stories'), {
        authorId: user.uid,
        authorName: user.displayName || 'Usuário',
        authorAvatar: user.photoURL || null,
        content: `🎯 #Desafio-${challenge.title}: ${responseText.trim()}`,
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
        type: 'young',
        isChallengeResponse: true,
        challengeId: challenge.id
      });

      // 2. Marcar desafio como completo
      const result = await completeChallenge(challenge.id, user.uid, challenge.xp);
      
      if (result.success) {
        toast.success(`Incrível! Partilha feita e +${challenge.xp} XP ganhos! 🎓`, { id: 'challenge-share' });
        setChallenge({ ...challenge, status: 'completed' });
        setTimeout(closePopup, 3000);
      }
    } catch (error) {
      console.error('Error sharing challenge response:', error);
      toast.error('Erro ao partilhar. Tenta novamente.', { id: 'challenge-share' });
    } finally {
      setSharing(false);
    }
  };

  const handleAction = () => {
    if (challenge?.actionUrl) {
      navigate(challenge.actionUrl);
      closePopup();
    }
  };

  const handleComplete = async () => {
    if (!challenge || challenge.status === 'completed') return;
    
    setLoading(true);
    toast.loading('A validar desafio...', { id: 'challenge-pop' });
    const result = await completeChallenge(challenge.id, user.uid, challenge.xp);
    
    if (result.success) {
      toast.success(`Parabéns! Ganhaste ${challenge.xp} XP! 🎯`, { id: 'challenge-pop' });
      setChallenge({ ...challenge, status: 'completed' });
      setTimeout(closePopup, 2000);
    } else {
      toast.error('Erro ao completar desafio.', { id: 'challenge-pop' });
    }
    setLoading(false);
  };

  if (!user || (!isOpen && !challenge)) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 py-8 pointer-events-none transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'} ${!isOpen ? 'hidden' : 'block'}`}
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-indigo-950/20 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={closePopup}
      />

      {/* Popup Container */}
      <div
        className={`bg-white/90 backdrop-blur-xl border-2 border-white/50 w-full max-w-sm rounded-[40px] shadow-[0_32px_64px_-16px_rgba(79,70,229,0.35)] p-8 pointer-events-auto relative overflow-hidden group transition-all duration-300 transform ${isClosing ? 'scale-95 translate-y-8 opacity-0' : 'scale-100 translate-y-0 opacity-100 animate-challenge-in'}`}
      >
        {/* Animated Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-indigo-600/20 transition-colors duration-700" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-600/5 rounded-full -ml-20 -mb-20 blur-3xl" />
        
        <button 
          onClick={closePopup}
          className="absolute top-6 right-6 p-2 hover:bg-indigo-50 rounded-full transition-all z-20 hover:rotate-90"
        >
          <X size={18} className="text-gray-400" />
        </button>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-200">
              <Zap size={12} fill="currentColor" className="animate-pulse" />
              Desafio Relâmpago
            </div>
            <div className="bg-indigo-50 px-3 py-1.5 rounded-2xl text-[11px] font-black text-indigo-600 border border-indigo-100/50">
              +{challenge.xp} XP
            </div>
          </div>

          <h3 className="text-2xl font-black text-indigo-950 mb-3 uppercase tracking-tighter leading-none">
            {challenge.title}
          </h3>
          
          <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
            {challenge.description}
          </p>

          {challenge.status !== 'completed' ? (
            <div className="flex flex-col gap-3">
              {challenge.type === 'writing' ? (
                <div className="mb-4">
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Escreve aqui a tua contribuição..."
                    className="w-full p-4 bg-indigo-50/50 border border-indigo-100 rounded-[24px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none min-h-[120px]"
                    disabled={sharing}
                  />
                  <button
                    onClick={handleShare}
                    disabled={sharing || !responseText.trim()}
                    className="w-full mt-3 bg-indigo-600 text-white py-4 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {sharing ? 'A publicar...' : 'Partilhar no Mural'} 
                    <Send size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAction}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-[0_20px_40px_-12px_rgba(79,70,229,0.4)] flex items-center justify-center gap-3 group/btn"
                >
                  Fazer Agora 
                  <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              )}
              
              <button
                onClick={handleComplete}
                disabled={loading || sharing}
                className="w-full py-2 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'A validar...' : (
                  <>
                    <CheckCircle size={14} /> Marcar como feito
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-green-600 font-black text-[11px] uppercase tracking-[0.2em] bg-green-50/50 border border-green-100 p-6 rounded-[24px] animate-bounce-subtle">
              <Award size={20} /> Incrível, Jovem!
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes challenge-in {
          0% { opacity: 0; transform: scale(0.8) translateY(100px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-challenge-in {
          animation: challenge-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite ease-in-out;
        }
      `}} />
    </div>
  );
}

