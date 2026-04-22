import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  StreamCall, 
  StreamTheme, 
  useCall, 
  useCallStateHooks, 
  ParticipantView,
} from '@stream-io/video-react-sdk';
import { 
  Channel, 
  Window, 
  MessageList, 
  MessageInput, 
  Thread,
} from 'stream-chat-react';
import { StreamContext } from '../contexts/streamContextValue';
import { useVideo } from '../contexts/VideoContext';
import { useAuth } from '../hooks/useAuth';
import { dataconnect } from '../services/firebase';
import { executeMutation, mutationRef } from 'firebase/data-connect';
import { addAcademyContent } from '../services/academy';
import '../styles/meeting-chat.css';


import {
  Copy,
  Share2,
  X,
  Download,
  CheckCircle2,
  Info,
  Users,
  MessageSquare,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Hand,
  MonitorUp,
  MonitorOff,
  MoreVertical,
  PhoneOff,
  UploadCloud,
  FileVideo,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── UI Overlay por Participante ──────────────────────────────────────────────
const ParticipantOverlay = ({ participant }) => {
  if (!participant) return null;
  const name = participant.isLocalParticipant ? 'Tu' : (participant.name || participant.user?.name || participant.userId || 'Participante');
  const isAudioMuted = !participant.audioStream;
  const isSpeaking = participant.isSpeaking;

  return (
    <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none z-10">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border transition-all duration-300 ${isSpeaking ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/10'}`}>
          <span className="text-white text-[11px] font-black tracking-tight truncate max-w-[100px] md:max-w-[150px]">
            {name}
          </span>
          {isAudioMuted ? (
            <div className="p-1 bg-red-500/20 rounded-lg">
              <MicOff size={12} className="text-red-400" />
            </div>
          ) : isSpeaking ? (
            <div className="flex gap-0.5 items-end h-3 mb-0.5">
              <div className="w-0.5 bg-blue-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '40%' }} />
              <div className="w-0.5 bg-blue-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" style={{ height: '80%' }} />
              <div className="w-0.5 bg-blue-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite]" style={{ height: '60%' }} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ─── Grid de Participantes ────────────────────────────────────────────────────
const ParticipantGrid = ({ participants, screenShareParticipant }) => {
  // Deduplicação ROBUSTA por userId — resolve o bug dos "usuários fantasma"
  // Prioriza o participante local e sessões com tracks ativos
  const uniqueParticipants = useMemo(() => {
    const participantMap = new Map();
    
    participants.forEach((p) => {
      const id = p.userId;
      const existing = participantMap.get(id);
      
      if (!existing) {
        participantMap.set(id, p);
      } else {
        // Se houver duplicata, prioriza:
        // 1. Participante local (sempre)
        // 2. O que tiver stream de vídeo ativo
        // 3. O que tiver stream de áudio ativo
        const pHasMedia = p.videoStream || p.audioStream;
        const eHasMedia = existing.videoStream || existing.audioStream;

        if (p.isLocalParticipant) {
          participantMap.set(id, p);
        } else if (!existing.isLocalParticipant && pHasMedia && !eHasMedia) {
          participantMap.set(id, p);
        }
      }
    });

    return Array.from(participantMap.values());
  }, [participants]);

  // ── Layout com Partilha de Ecrã (Screen Share) ──
  if (screenShareParticipant) {
    return (
      <div className="flex flex-col md:flex-row h-full w-full gap-2 p-2 bg-[#202124]">
        {/* Tela Principal (Screen Share) - fixa no Mobile, 75% no Desktop */}
        <div className="min-h-[40vh] md:min-h-0 flex-[3] relative rounded-2xl overflow-hidden bg-[#1a1b1e] border border-white/5 shadow-2xl">
          <ParticipantView
            participant={screenShareParticipant}
            trackType="screenShareTrack"
            ParticipantViewUI={() => (
              <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                <MonitorUp size={14} className="text-blue-400" />
                <span className="text-white text-[11px] font-bold tracking-tight">
                  {screenShareParticipant.name || 'Ecrã partilhado'}
                </span>
              </div>
            )}
          />
        </div>

        {/* Coluna Lateral de Participantes - 25% no Desktop */}
        <div className="min-h-[120px] flex-1 min-w-[160px] md:max-w-[200px] flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto scrollbar-hide">
          {uniqueParticipants.map((p) => (
            <div
              key={p.sessionId}
              className="relative rounded-xl overflow-hidden bg-[#1a1b1e] aspect-video w-[140px] md:w-full shrink-0 border border-white/5 hover:border-white/20 transition-all shadow-md"
            >
              <ParticipantView participant={p} ParticipantViewUI={ParticipantOverlay} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const count = uniqueParticipants.length;

  // ── Estado de Carregamento / Vazio ──
  if (count === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#202124]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-green-500/10 border-t-green-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-green-500/20 rounded-full animate-ping" />
            </div>
          </div>
          <p className="text-green-500 text-[10px] font-bold tracking-[0.3em] uppercase animate-pulse">Estabilizando conexão...</p>
        </div>
      </div>
    );
  }

  // ── Grid Dinâmico (Sem Partilha) ──

  if (count === 1) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4 md:p-8 bg-[#202124]">
        <div className="w-full max-w-6xl h-full max-h-[85vh] rounded-[2.5rem] overflow-hidden relative bg-[#1a1b1e] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/5 ring-1 ring-white/10">
          <ParticipantView participant={uniqueParticipants[0]} ParticipantViewUI={ParticipantOverlay} />
        </div>
      </div>
    );
  }

  // Layout para 2 pessoas: Lado a Lado no Desktop
  if (count === 2) {
    return (
      <div className="flex flex-col md:flex-row h-full w-full items-center justify-center gap-4 p-4 md:p-10 bg-[#202124]">
        {uniqueParticipants.map((p) => (
          <div 
            key={p.sessionId} 
            className="relative flex-1 w-full max-w-2xl aspect-video rounded-[2rem] overflow-hidden bg-[#1a1b1e] border border-white/5 shadow-2xl transition-all duration-500 hover:ring-2 hover:ring-green-500/30"
          >
            <ParticipantView participant={p} ParticipantViewUI={ParticipantOverlay} />
          </div>
        ))}
      </div>
    );
  }

  // Layout para 3 ou mais pessoas: Grid Adaptativo
  
  return (
    <div className="h-full w-full p-2 md:p-8 bg-[#202124] flex items-center justify-center overflow-y-auto scrollbar-hide pb-28 md:pb-0">
      <div 
        className="w-full max-w-7xl grid gap-2 md:gap-4 place-content-center"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          width: '100%'
        }}
      >
        {uniqueParticipants.map((p) => (
          <div 
            key={p.sessionId} 
            className={`relative aspect-video rounded-2xl md:rounded-[1.5rem] overflow-hidden bg-[#1a1b1e] border shadow-lg group transition-all duration-500 ${p.isSpeaking ? 'border-blue-500 ring-4 ring-blue-500/20 z-20 scale-[1.02]' : 'border-white/5 hover:border-white/20'}`}
          >
            <ParticipantView participant={p} ParticipantViewUI={ParticipantOverlay} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Componente de Chat da Reunião ───────────────────────────────────────────
const MeetingChat = ({ channelId }) => {
  const { chatClient } = React.useContext(StreamContext);
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!chatClient || !channelId) return;

    const initChannel = async () => {
      try {
        // Sanitização do ID: Stream Chat requer caracteres específicos (a-z, 0-9, _, -)
        const sanitizedId = channelId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        
        // 'livestream' é mais adequado para reuniões públicas/por link
        const c = chatClient.channel('livestream', `meeting-${sanitizedId}`, {
          name: `Meeting Chat`,
        });

        await c.watch();
        setChannel(c);
      } catch (err) {
        console.error('Erro ao inicializar canal de chat:', err);
        setError(true);
      }
    };

    initChannel();
  }, [chatClient, channelId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <X size={32} className="text-red-400 mb-2 opacity-20" />
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Falha ao carregar chat</p>
      </div>
    );
  }

  if (!channel || !chatClient) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-8 h-8 border-2 border-white/5 border-t-white/30 rounded-full animate-spin mb-3" />
        <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em]">Conectando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full chat-container-dark">
      <Channel channel={channel}>
        <Window>
          <MessageList 
            hideDeletedMessages 
            messageActions={['react', 'reply']} 
          />
          <MessageInput focus />
        </Window>
        <Thread />
      </Channel>
    </div>
  );
};

// ─── Modal de Publicação na Academia ─────────────────────────────────────────
const PublishToAcademyModal = ({ isOpen, onClose, onPublish, recording, isPublishing }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('tech');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const categories = [
    { id: '10-12', label: 'Ensino Secundário 🎓' },
    { id: 'Superior', label: 'Ensino Superior 🏛️' },
    { id: 'agriculture', label: 'Agricultura & Pescas 🇸🇹' },
    { id: 'tourism', label: 'Turismo & Hospitalidade 🏖️' },
    { id: 'tech', label: 'Tecnologia & Inovação 💻' },
    { id: 'business', label: 'Negócios & Empreendedorismo 📈' },
    { id: 'career', label: 'Dicas de Carreira 🚀' },
    { id: 'youth_orientation', label: 'Orientação Jovem 🗣️' },
    { id: 'general', label: 'Saber Geral / Outros 🌍' }
  ];

  useEffect(() => {
    if (recording && isOpen) {
      const dateStr = new Date(recording.start_time).toLocaleDateString('pt-PT', { 
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
      });
      setTitle(`Reunião - ${dateStr}`);
    }
  }, [recording, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[250] px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative bg-[#1a1b1e] rounded-[2.5rem] p-8 w-full max-w-lg shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 ring-1 ring-white/10 transform animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter mb-1">Publicar na Academia</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Partilhar conhecimento com a rede</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 ml-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-bold focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
              placeholder="Ex: Aula sobre Marketing"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 ml-1">Secção / Categoria</label>
            {!isNewCategory ? (
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-bold focus:ring-2 focus:ring-green-500/50 outline-none transition-all appearance-none cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-[#1a1b1e]">{cat.label}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setIsNewCategory(true)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all"
                >
                  Nova +
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-bold focus:ring-2 focus:ring-green-500/50 outline-none transition-all"
                  placeholder="Nome da nova secção..."
                />
                <button 
                  onClick={() => setIsNewCategory(false)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 ml-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-medium focus:ring-2 focus:ring-green-500/50 outline-none transition-all h-24 resize-none"
              placeholder="Descreve brevemente o conteúdo desta reunião..."
            />
          </div>

          <button
            onClick={() => onPublish({ title, description, category: isNewCategory ? newCategoryName : category })}
            disabled={isPublishing || !title || (isNewCategory && !newCategoryName)}
            className="w-full bg-green-600 text-white py-5 rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-green-500 transition-all active:scale-95 text-xs uppercase tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-green-600/30 mt-4"
          >
            {isPublishing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UploadCloud size={18} /> Publicar na Academia
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const MeetOverlay = ({
  callId,
  activeSidebar,
  setActiveSidebar,
  showInviteModal,
  setShowInviteModal,
  showRecordingsMenu,
  setShowRecordingsMenu,
  participants,
  onOpenPublishModal,
}) => {
  const call = useCall();
  const { getRecordings } = useVideo();
  const [recordings, setRecordings] = useState([]);
  const [isCopying, setIsCopying] = useState(false);

  const inviteUrl = window.location.href;

  const copyToClipboard = useCallback(() => {
    const doCopy = () => {
      setIsCopying(true);
      toast.success('Link copiado para a área de transferência');
      setTimeout(() => setIsCopying(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteUrl).then(doCopy).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = inviteUrl;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        doCopy();
      });
    }
  }, [inviteUrl]);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'JovensSTP Meet', url: inviteUrl }); } catch (_) {}
    } else {
      copyToClipboard();
    }
  };

  useEffect(() => {
    if (!showRecordingsMenu || !call?.id) return;
    getRecordings(call.id).then((d) => setRecordings(d || [])).catch(console.error);
  }, [showRecordingsMenu, call?.id, getRecordings]);

  // Deduplicação Robusta na Sidebar também
  const uniqueParticipants = useMemo(() => {
    const map = new Map();
    participants.forEach((p) => {
      const id = p.userId;
      const existing = map.get(id);
      if (!existing || p.isLocalParticipant || (p.videoStream && !existing.videoStream)) {
        map.set(id, p);
      }
    });
    return Array.from(map.values());
  }, [participants]);

  return (
    <>
      {/* ── Modal de Convite ── */}
      {showInviteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-[#1a1b1e] rounded-[2.5rem] p-10 w-full max-w-md shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 ring-1 ring-white/10 transform animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter mb-1">A sua reunião está pronta</h2>
                <p className="text-white/40 text-xs font-medium uppercase tracking-[0.2em]">Convidar participantes</p>
              </div>
              <button 
                onClick={() => setShowInviteModal(false)} 
                className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-white/60 text-[13px] mb-10 leading-relaxed max-w-[280px]">
              Envie este link para as pessoas que deseja que participem na reunião.
            </p>
            
            <div className="bg-white/5 p-6 rounded-[1.5rem] flex items-center justify-between mb-8 border border-white/5 group transition-all hover:bg-white/10">
              <span className="text-white/80 text-[11px] font-mono truncate mr-4 tracking-tighter opacity-70 group-hover:opacity-100">{inviteUrl}</span>
              <button 
                onClick={copyToClipboard} 
                className={`p-3 rounded-2xl transition-all active:scale-90 ${isCopying ? 'bg-green-500 text-white shadow-lg shadow-green-500/40' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isCopying ? <CheckCircle2 size={24} /> : <Copy size={24} />}
              </button>
            </div>

            <button
              onClick={handleShare}
              className="w-full bg-green-600 text-white py-6 rounded-[1.5rem] shadow-2xl shadow-green-600/30 font-black flex items-center justify-center gap-3 hover:bg-green-500 transition-all active:scale-95 text-xs uppercase tracking-[0.3em] overflow-hidden relative overflow-hidden"
            >
              <Share2 size={18} /> Partilhar Acesso
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebars ── */}
      {activeSidebar && (
        <div className="absolute top-0 right-0 h-full w-full md:w-[360px] bg-[#1a1b1e] z-[300] shadow-2xl flex flex-col border-l border-white/5 animate-in slide-in-from-right duration-300 ease-out">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              {activeSidebar === 'participants' ? 'Pessoas' : activeSidebar === 'info' ? 'Detalhes' : 'Chat'}
            </h3>
            <button onClick={() => setActiveSidebar(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
              <X size={20} className="text-white/40 group-hover:text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {activeSidebar === 'participants' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Ativos agora</p>
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[9px] font-bold rounded-full border border-green-500/20">{uniqueParticipants.length} online</span>
                </div>
                {uniqueParticipants.map((p) => {
                  const name = p.name || p.userId || 'Participante';
                  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                  const isPresenting = p.screenShareStream;
                  return (
                    <div key={p.sessionId} className="flex items-center gap-3 p-3 rounded-2xl bg-white/0 hover:bg-white/5 transition-all group">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <p className="text-white text-sm font-bold truncate">{name}</p>
                          {p.isLocalParticipant && <span className="text-[9px] text-green-400 font-black uppercase tracking-tighter shrink-0">(Tu)</span>}
                        </div>
                        {isPresenting && <p className="text-[9px] text-blue-400 font-bold flex items-center gap-1"><MonitorUp size={10} /> Apresentando</p>}
                      </div>
                      <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {!p.audioStream ? <MicOff size={14} className="text-red-400" /> : <Mic size={14} className="text-green-500" />}
                        {!p.videoStream && <CameraOff size={14} className="text-red-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {activeSidebar === 'chat' && (
              <div className="h-full flex flex-col">
                <MeetingChat channelId={callId} />
              </div>
            )}

            {activeSidebar === 'info' && (
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Informações da Chamada</p>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-[11px] text-white/60 break-all font-mono leading-relaxed select-all">
                    {inviteUrl}
                  </div>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="w-full py-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-500/20 transition-all active:scale-[0.98]"
                >
                  <Copy size={16} /> Copiar Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Menu de Gravações ── */}
      {showRecordingsMenu && (
        <div className="absolute top-4 right-4 z-[150] w-80 bg-[#1a1b1e] rounded-[1.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-xs uppercase tracking-widest">Histórico</span>
              <button 
                onClick={() => {
                  setRecordings([]);
                  getRecordings(call.id).then(setRecordings).catch(console.error);
                  toast.success('Atualizando...');
                }}
                className="p-1 text-white/40 hover:text-white transition-all active:rotate-180 duration-500"
                title="Atualizar lista"
              >
                <div className="flex items-center gap-1">
                   {/* Usando um ícone simples ou o de Download com rotação */}
                   <Share2 size={12} className="rotate-90" />
                </div>
              </button>
            </div>
            <button onClick={() => setShowRecordingsMenu(false)} className="text-white/30 hover:text-white p-1 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {recordings.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <Download size={24} className="text-white/10" />
                <p className="text-white/20 text-[11px] font-bold uppercase">Sem gravações</p>
              </div>
            ) : (
              recordings.map((rec, i) => (
                <div key={i} className="p-4 rounded-xl hover:bg-white/5 flex items-center justify-between group transition-all">
                  <div className="min-w-0">
                    <p className="text-white text-[11px] font-bold truncate">
                      {new Date(rec.start_time).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-white/30 text-[9px] font-mono tracking-tighter">{(rec.file_size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onOpenPublishModal(rec)}
                      className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                      title="Publicar na Academia"
                    >
                      <UploadCloud size={16} />
                    </button>
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-green-500/10 text-green-400 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-lg"
                      title="Descarregar"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

// ─── Componentes de Botão ─────────────────────────────────────────────────────
const ControlBtn = ({ children, onClick, danger, active, title, className = '' }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex shrink-0 items-center justify-center p-3 md:p-4 rounded-full border transition-all duration-300 active:scale-90 shadow-lg ${className} ${
      danger
        ? 'bg-red-500 border-red-500 text-white shadow-red-500/20'
        : active
        ? 'bg-white border-white text-[#202124]'
        : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
    }`}
  >
    {children}
  </button>
);

const UtilBtn = ({ children, onClick, active, title, className = '' }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex shrink-0 items-center p-2 md:p-3 rounded-2xl transition-all relative ${className} ${
      active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
    }`}
  >
    {children}
  </button>
);

// ─── Meeting Inner ────────────────────────────────────────────────────────────
const MeetingInner = ({ callId }) => {
  const call = useCall();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startRecording, stopRecording } = useVideo();

  const {
    useIsCallRecordingInProgress,
    useParticipants,
    useMicrophoneState,
    useCameraState,
    useScreenShareState,
  } = useCallStateHooks();

  const isRecording = useIsCallRecordingInProgress();
  const participants = useParticipants();
  const { isMute: micMuted } = useMicrophoneState();
  const { isMute: camMuted } = useCameraState();
  const { isSharing: sharingScreen } = useScreenShareState();

  const [activeSidebar, setActiveSidebar] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRecordingsMenu, setShowRecordingsMenu] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const screenShareParticipant = useMemo(() => {
    return participants.find((p) => {
      return p.screenShareStream != null || 
             (p.publishedTracks && (p.publishedTracks.includes('screenShare') || p.publishedTracks.includes('screenShareTrack') || p.publishedTracks.includes('screen-share')))
    })
  }, [participants]);

  const uniqueCount = useMemo(() => {
    const ids = new Set();
    participants.forEach((p) => ids.add(p.userId));
    return ids.size;
  }, [participants]);

  const handleToggleMic = useCallback(async () => {
    try { await call.microphone.toggle(); }
    catch (_) { toast.error('Erro no Microfone'); }
  }, [call]);

  const handleToggleCamera = useCallback(async () => {
    try { await call.camera.toggle(); }
    catch (_) { toast.error('Erro na Câmara'); }
  }, [call]);

  const handleToggleScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      toast.error('A partilha de ecrã não é suportada neste dispositivo móvel/browser.');
      return;
    }
    try { await call.screenShare.toggle(); }
    catch (_) { toast.error('Erro na partilha'); }
  }, [call]);

  const handleToggleRecording = useCallback(async () => {
    try {
      if (isRecording) {
        await stopRecording(call);
        toast.promise(
          (async () => {
            // Esperar o Stream processar os metadados
            await new Promise((resolve) => setTimeout(resolve, 8000));
            
            try {
              const recs = await call.queryRecordings();
              if (recs.recordings && recs.recordings.length > 0) {
                const latest = [...recs.recordings].sort((a, b) => 
                  new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                )[0];

                // Persistir no Postgres via Data Connect Manual
                await executeMutation(mutationRef(dataconnect, 'CreateMeetingRecording', {
                  meetingId: call.id,
                  recordingUrl: latest.url,
                  duration: latest.end_time ? Math.floor((new Date(latest.end_time).getTime() - new Date(latest.start_time).getTime()) / 1000) : 0,
                  userId: user?.uid || 'guest'
                }));
                console.log('✅ Gravação sincronizada com Postgres');
              }
            } catch (err) {
              console.error('❌ Falha ao salvar no Postgres:', err);
            }
          })(),
          {
            loading: 'Processando gravação...',
            success: 'Gravação salva com sucesso!',
            error: 'Erro ao processar gravação'
          }
        );
      } else {
        await startRecording(call);
        toast.success('Gravação iniciada');
      }
    } catch (e) {
      toast.error('Erro na gravação: ' + e.message);
    }
  }, [isRecording, startRecording, stopRecording, call, user?.uid]);


  const handleLeave = useCallback(async () => {
    try { await call.leave(); } catch (_) {}
    navigate('/home');
  }, [call, navigate]);

  const onOpenPublishModal = (rec) => {
    setSelectedRecording(rec);
    setShowPublishModal(true);
  };

  const handlePublishToAcademy = async (data) => {
    if (!selectedRecording) return;
    setIsPublishing(true);
    try {
      const enrichedData = {
        title: data.title,
        description: data.description,
        category: data.category,
        link: selectedRecording.url,
        type: 'video',
        authorId: user?.uid || 'guest',
        authorName: user?.displayName || 'Utilizador JovemSTP',
        status: 'pending', // Sempre pendente para moderação inicial
      };

      const result = await addAcademyContent(enrichedData);
      if (result.success) {
        toast.success('Enviado para a Academia (A aguardar moderação)');
        setShowPublishModal(false);
      } else {
        throw new Error('Erro ao salvar no Firestore');
      }
    } catch (err) {
      console.error('Erro ao publicar:', err);
      toast.error('Erro ao publicar na Academia.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#202124] flex flex-col overflow-hidden font-sans select-none antialiased relative">
      <StreamTheme>
        {/* Main Content Area */}
        <div className={`flex-1 relative overflow-hidden transition-all duration-500 ease-out ${activeSidebar ? 'md:mr-[320px]' : ''}`}>
          <ParticipantGrid
            participants={participants}
            screenShareParticipant={screenShareParticipant}
          />

          {/* Banner de Screen Share Ativo — estilo Google Meet */}
          {sharingScreen && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 bg-[#1a73e8] shadow-2xl shadow-blue-600/40 rounded-full z-[80] animate-in zoom-in slide-in-from-top-4 duration-300">
              <MonitorUp size={16} className="text-white" />
              <span className="text-white text-[11px] font-black tracking-widest uppercase">A partilhar ecrã</span>
              <button
                onClick={handleToggleScreenShare}
                className="ml-1 flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-all text-white text-[11px] font-bold"
              >
                <X size={12} /> Parar
              </button>
            </div>
          )}

          {isRecording && (
            <div className="absolute top-4 left-6 flex items-center gap-2.5 px-4 py-2 bg-red-600 shadow-2xl shadow-red-600/40 rounded-full z-[80] animate-in zoom-in slide-in-from-top-4 duration-300">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-[10px] font-black tracking-widest uppercase">Gravando</span>
            </div>
          )}

          <MeetOverlay
            callId={callId}
            activeSidebar={activeSidebar}
            setActiveSidebar={setActiveSidebar}
            showInviteModal={showInviteModal}
            setShowInviteModal={setShowInviteModal}
            showRecordingsMenu={showRecordingsMenu}
            setShowRecordingsMenu={setShowRecordingsMenu}
            participants={participants}
            onOpenPublishModal={onOpenPublishModal}
          />

          <PublishToAcademyModal 
            isOpen={showPublishModal}
            onClose={() => setShowPublishModal(false)}
            onPublish={handlePublishToAcademy}
            recording={selectedRecording}
            isPublishing={isPublishing}
          />
        </div>

        {/* Global Floating Control Bar — Estilo Google Meet 2024 */}
        <div className="absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 w-[98%] md:w-auto z-[200]">
          <div className="bg-[#202124]/95 backdrop-blur-2xl border border-white/10 rounded-3xl md:rounded-full px-2 md:px-8 py-2 md:py-4 flex flex-row items-center justify-between gap-1 md:gap-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t border-white/15 overflow-x-auto scrollbar-hide">
            
            {/* Lado Esquerdo — Desktop Info */}
            <div className="hidden lg:flex items-center gap-4 text-white">
              <div className="flex flex-col border-r border-white/10 pr-4">
                <span className="text-base font-black tracking-tighter leading-none mb-0.5">{currentTime}</span>
                <span className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em]">Meet</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[9px] font-mono text-white/40">
                {callId}
              </div>
            </div>

            {/* Botões Centrais — TODOS visíveis no mobile */}
            <div className="flex items-center gap-1.5 md:gap-4 shrink-0 mx-auto">
              
              <ControlBtn 
                danger={micMuted} 
                onClick={handleToggleMic} 
                title={micMuted ? "Ativar microfone" : "Silenciar"}
                className="w-11 h-11 md:w-14 md:h-14"
              >
                {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </ControlBtn>

              <ControlBtn 
                danger={camMuted} 
                onClick={handleToggleCamera} 
                title={camMuted ? "Ativar câmara" : "Desligar câmara"}
                className="w-11 h-11 md:w-14 md:h-14"
              >
                {camMuted ? <CameraOff size={18} /> : <Camera size={18} />}
              </ControlBtn>

              <ControlBtn 
                active={sharingScreen} 
                onClick={handleToggleScreenShare} 
                title={sharingScreen ? "Parar partilha" : "Apresentar ecrã"}
                className={`w-11 h-11 md:w-14 md:h-14 ${sharingScreen ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#202124]' : ''}`}
              >
                {sharingScreen ? <MonitorOff size={18} className="text-red-400" /> : <MonitorUp size={18} />}
              </ControlBtn>

              <ControlBtn 
                active={isRecording}
                onClick={handleToggleRecording}
                title={isRecording ? "Parar gravação" : "Iniciar gravação"}
                className={`w-11 h-11 md:w-14 md:h-14 ${isRecording ? 'ring-2 ring-red-400 ring-offset-1 ring-offset-[#202124]' : ''}`}
              >
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/70'}`} />
              </ControlBtn>

              <button
                onClick={handleLeave}
                className="flex items-center justify-center w-11 h-11 md:w-14 md:h-14 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all active:scale-95 shadow-xl shadow-red-500/20 shrink-0"
              >
                <PhoneOff size={18} />
              </button>
            </div>

            {/* Lado Direito — Utilitários */}
            <div className="flex items-center gap-1 md:gap-3 flex-1 justify-end">
              {/* Utilitários — sempre visíveis, tamanho menor no mobile */}
              <div className="flex items-center gap-0.5 shrink-0 bg-white/5 px-1 md:px-2 rounded-2xl border border-white/5 shadow-inner">
                <UtilBtn 
                  active={activeSidebar === 'participants'} 
                  onClick={() => setActiveSidebar(activeSidebar === 'participants' ? null : 'participants')}
                  title="Participantes"
                >
                  <Users size={18} />
                  <div className="absolute -top-1 -right-1 min-w-[15px] h-[15px] flex items-center justify-center bg-blue-500 rounded-full border-2 border-[#202124]">
                    <span className="text-[8px] font-black text-white">{uniqueCount}</span>
                  </div>
                </UtilBtn>

                <UtilBtn 
                  active={activeSidebar === 'chat'} 
                  onClick={() => setActiveSidebar(activeSidebar === 'chat' ? null : 'chat')}
                  title="Chat"
                >
                  <MessageSquare size={18} />
                </UtilBtn>

                <UtilBtn
                  active={showRecordingsMenu}
                  onClick={() => setShowRecordingsMenu(v => !v)}
                  title="Gravações"
                >
                  <Download size={18} />
                </UtilBtn>

                <UtilBtn
                  onClick={() => setShowInviteModal(true)}
                  title="Convidar"
                >
                  <Share2 size={18} />
                </UtilBtn>
              </div>
            </div>
          </div>
        </div>
      </StreamTheme>
    </div>
  );
};


// ─── Meeting Page ─────────────────────────────────────────────────────────────
const MeetingPage = () => {
  const { callId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { videoClient } = useVideo();
  const [call, setCall] = useState(null);
  const [lobbyState, setLobbyState] = useState('lobby'); // 'lobby' | 'joined'

  useEffect(() => {
    if (!videoClient || !callId) return;
    // Apenas cria o objeto call — NÃO faz join ainda
    const myCall = videoClient.call('default', callId);
    setCall(myCall);
  }, [videoClient, callId]);

  const handleJoin = async () => {
    if (!call) return;
    try {
      await call.join({ 
        create: true, 
        ring: false, 
        notify: false 
      });
      setLobbyState('joined');
    } catch (err) {
      console.error('Erro ao entrar na sala:', err);
      toast.error('Erro ao entrar na sala.');
      navigate('/home');
    }
  };

  if (!call || !videoClient) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#202124] p-6 text-center">
        <div className="w-16 h-16 border-4 border-green-500/10 border-t-green-500 rounded-full animate-spin mb-4" />
        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">A preparar sala...</p>
      </div>
    );
  }

  // ── Ecrã de Lobby (antes de entrar) ──
  if (lobbyState === 'lobby') {
    return (
      <div className="h-screen w-full bg-[#202124] flex flex-col items-center justify-center gap-8 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-white text-2xl font-black tracking-tight">Pronto para entrar?</h1>
          <p className="text-white/40 text-sm font-mono">{callId}</p>
        </div>

        {/* Preview info */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-black shadow-2xl tracking-tighter">
            {(user?.displayName || 'U').slice(0, 2).toUpperCase()}
          </div>
          <p className="text-white text-sm font-bold">{user?.displayName || user?.email}</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleJoin}
            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-green-600/30"
          >
            Entrar na reunião
          </button>
          <button
            onClick={() => navigate('/home')}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl font-bold text-sm transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Reunião ativa ──
  return (
    <StreamCall call={call}>
      <MeetingInner callId={callId} />
    </StreamCall>
  );
};

export default MeetingPage;
