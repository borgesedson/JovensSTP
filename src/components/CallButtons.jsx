import React, { useState } from 'react';
import { Phone, Video } from 'lucide-react';
import { useCallActions } from '../hooks/useVideo';
import VideoCallModal from './VideoCallModal';
import { OutgoingCallScreen } from './OutgoingCallScreen';
import { toast } from 'react-hot-toast';

const CallButtons = ({ userId, userName, userImage, className = '' }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [callType, setCallType] = useState(null);
  const { startAudioCall, startVideoCall } = useCallActions();

  // Iniciar chamada de áudio
  const handleAudioCall = async () => {
    try {
      setIsAudioOnly(true);
      setCallType('audio');
      setIsConnecting(true);
      setTargetUser({ displayName: userName, photoURL: userImage, uid: userId });
      
      const result = await startAudioCall(userId);
      setActiveCall(result.call);
      setIsConnecting(false);
    } catch (error) {
      console.error('Erro ao iniciar chamada de áudio:', error);
      toast.error('Não foi possível iniciar a chamada de áudio');
      setIsConnecting(false);
    }
  };

  // Iniciar chamada de vídeo
  const handleVideoCall = async () => {
    try {
      setIsAudioOnly(false);
      setCallType('video');
      setIsConnecting(true);
      setTargetUser({ displayName: userName, photoURL: userImage, uid: userId });
      
      const result = await startVideoCall(userId);
      setActiveCall(result.call);
      setIsConnecting(false);
    } catch (error) {
      console.error('Erro ao iniciar chamada de vídeo:', error);
      toast.error('Não foi possível iniciar a chamada de vídeo');
      setIsConnecting(false);
    }
  };

  // Fechar modal de chamada
  const handleCloseCall = () => {
    setActiveCall(null);
    setIsAudioOnly(false);
    setTargetUser(null);
    setCallType(null);
  };

  // Cancelar chamada em andamento
  const handleCancelCall = async () => {
    if (activeCall) {
      try {
        await activeCall.leave();
      } catch (error) {
        console.error('Erro ao cancelar chamada:', error);
      }
    }
    setIsConnecting(false);
    setActiveCall(null);
    setTargetUser(null);
    setCallType(null);
    toast('Chamada cancelada', { icon: '📞' });
  };

  return (
    <>
      <div className={`flex space-x-2 ${className}`}>
        {/* Botão de chamada de áudio */}
        <button
          onClick={handleAudioCall}
          disabled={isConnecting || activeCall}
          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Ligar para ${userName}`}
        >
          <Phone className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Botão de chamada de vídeo */}
        <button
          onClick={handleVideoCall}
          disabled={isConnecting || activeCall}
          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Videochamada com ${userName}`}
        >
          <Video className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Tela de conectando (Outgoing Call) */}
      {isConnecting && targetUser && (
        <OutgoingCallScreen
          targetUser={targetUser}
          callType={callType}
          onCancel={handleCancelCall}
        />
      )}

      {/* Modal de chamada ativa */}
      {activeCall && !isConnecting && (
        <VideoCallModal
          call={activeCall}
          onClose={handleCloseCall}
          isAudioOnly={isAudioOnly}
        />
      )}
    </>
  );
};

export default CallButtons;