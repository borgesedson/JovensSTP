import React, { useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { StreamCall, useCalls, CallingState, useCallStateHooks } from '@stream-io/video-react-sdk';
import VideoCallModal from './VideoCallModal';
import { toast } from 'react-hot-toast';

/**
 * Componente principal que observa todas as chamadas
 * Usa o hook useCalls() para receber notificações de chamadas recebidas
 */
const IncomingCallNotification = () => {
  const calls = useCalls(); // Hook que retorna TODAS as chamadas ativas/pendentes

  // Filtrar apenas chamadas recebidas que estão tocando (não criadas por mim)
  const incomingCalls = calls.filter(
    (call) => !call.isCreatedByMe && call.state.callingState === CallingState.RINGING
  );

  // Mostrar notificação para cada chamada recebida
  return (
    <>
      {incomingCalls.map((call) => (
        <StreamCall call={call} key={call.cid}>
          <IncomingCallCard call={call} />
        </StreamCall>
      ))}
    </>
  );
};

/**
 * Card individual para cada chamada recebida
 * Este componente está dentro de <StreamCall> então tem acesso aos hooks
 */
const IncomingCallCard = ({ call }) => {
  const { useCallCallingState, useCallCustomData, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const customData = useCallCustomData();
  const participants = useParticipants();
  const [showModal, setShowModal] = useState(false);

  // Pegar informações do usuário que está chamando
  const caller = participants.find((p) => p.userId !== call.currentUserId);
  const callerName = caller?.name || caller?.userId || 'Usuário';
  const callerImage = caller?.image;
  const callType = customData?.type || 'video'; // 'audio' ou 'video'
  const isVideoCall = callType === 'video';

  // Aceitar chamada
  const handleAcceptCall = async () => {
    try {
      await call.join();
      
      // Se for chamada de áudio, garantir que microfone está ativo
      if (callType === 'audio') {
        await call.camera.disable(); // Desabilitar câmera
        await call.microphone.enable(); // Garantir que áudio está ativo
      }
      
      setShowModal(true);
      toast.success(`Chamada aceita com ${callerName}`);
    } catch (error) {
      console.error('Erro ao aceitar chamada:', error);
      toast.error('Erro ao aceitar chamada');
    }
  };

  // Aceitar como áudio apenas
  const handleAcceptAudioOnly = async () => {
    try {
      await call.join({ create: false });
      await call.camera.disable(); // Desabilitar câmera
      await call.microphone.enable(); // Garantir que áudio está ativo
      setShowModal(true);
      toast.success(`Chamada aceita (áudio apenas) com ${callerName}`);
    } catch (error) {
      console.error('Erro ao aceitar chamada:', error);
      toast.error('Erro ao aceitar chamada');
    }
  };

  // Rejeitar chamada
  const handleRejectCall = async () => {
    try {
      await call.leave({ reject: true, reason: 'decline' });
      toast.success('Chamada recusada');
    } catch (error) {
      console.error('Erro ao rejeitar chamada:', error);
      toast.error('Erro ao rejeitar chamada');
    }
  };

  // Se a chamada foi aceita, mostrar o modal full-screen
  if (showModal) {
    return (
      <VideoCallModal
        call={call}
        onClose={() => setShowModal(false)}
        isAudioOnly={!isVideoCall}
      />
    );
  }

  // Só mostrar notificação se ainda estiver tocando
  if (callingState !== CallingState.RINGING) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl animate-scale-in">
        {/* Avatar do usuário que está ligando */}
        <div className="mb-4">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-blue-500 animate-pulse-slow">
            {callerImage ? (
              <img
                src={callerImage}
                alt={callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">
                {callerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Informações da chamada */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            {callerName}
          </h2>
          <p className="text-gray-600 flex items-center justify-center">
            {isVideoCall ? (
              <>
                <Video className="w-4 h-4 mr-2" />
                Chamada de vídeo recebida
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Chamada de áudio recebida
              </>
            )}
          </p>
        </div>

        {/* Animação de onda sonora */}
        <div className="flex justify-center items-center space-x-1 mb-6">
          <div className="w-1 h-8 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0s' }}></div>
          <div className="w-1 h-6 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1 h-10 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-4 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.3s' }}></div>
          <div className="w-1 h-8 bg-green-500 rounded animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-center space-x-6 mb-4">
          {/* Rejeitar chamada */}
          <button
            onClick={handleRejectCall}
            className="flex flex-col items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all transform hover:scale-110 shadow-lg"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Aceitar chamada */}
          <button
            onClick={handleAcceptCall}
            className="flex flex-col items-center justify-center w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all transform hover:scale-110 shadow-lg animate-pulse"
          >
            {isVideoCall ? (
              <Video className="w-7 h-7" />
            ) : (
              <Phone className="w-7 h-7" />
            )}
          </button>
        </div>

        {/* Opção para aceitar apenas áudio em chamadas de vídeo */}
        {isVideoCall && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleAcceptAudioOnly}
              className="flex items-center justify-center mx-auto space-x-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              <span>Aceitar apenas áudio</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomingCallNotification;