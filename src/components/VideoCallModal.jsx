import React, { useState, useEffect, useRef } from 'react';
import {
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  CallControls,
  CallingState,
  ParticipantView,
  useCallStateHooks
} from '@stream-io/video-react-sdk';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Settings,
  MoreVertical
} from 'lucide-react';
import { useStreamChat } from '../hooks/useStreamChat';
import { sendCallLogMessage } from '../services/callLogs';

const VideoCallModal = ({ call, onClose, isAudioOnly = false }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90">
      <StreamTheme className="h-full">
        <StreamCall call={call}>
          <VideoCallContent
            call={call}
            onClose={onClose}
            isAudioOnly={isAudioOnly}
            isMinimized={isMinimized}
            setIsMinimized={setIsMinimized}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
          />
        </StreamCall>
      </StreamTheme>
    </div>
  );
};

// Componente interno que tem acesso aos hooks do StreamCall
const VideoCallContent = ({ call, onClose, isAudioOnly, isMinimized, setIsMinimized, showSettings, setShowSettings }) => {
  const { useCallCallingState, useLocalParticipant, useRemoteParticipants, useParticipantCount } = useCallStateHooks();
  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const participantCount = useParticipantCount();
  const { chatClient: client } = useStreamChat();

  // Rastrear duração da chamada
  const callStartTime = useRef(null);
  const callAnswered = useRef(false);
  const logSent = useRef(false);

  // Iniciar timer quando alguém entrar
  useEffect(() => {
    if (callingState === CallingState.JOINED && !callStartTime.current) {
      callStartTime.current = Date.now();
      callAnswered.current = true;
      console.log('⏱️ Chamada iniciada');
    }
  }, [callingState]);

  // Detectar quando chamada termina
  useEffect(() => {
    if ((callingState === CallingState.LEFT || callingState === CallingState.OFFLINE) && !logSent.current) {
      logSent.current = true;
      handleCallEnded();
    }
  }, [callingState]);

  // Registrar log da chamada
  const handleCallEnded = async () => {
    const customData = call?.state?.custom || {};
    const targetUserId = customData.callerId === client?.userID
      ? remoteParticipants[0]?.userId
      : customData.callerId;

    if (!targetUserId) {
      console.warn('Target user ID não encontrado');
      return;
    }

    let status = 'missed';
    let duration = 0;

    if (callAnswered.current && callStartTime.current) {
      // Chamada foi atendida
      status = 'completed';
      duration = Math.floor((Date.now() - callStartTime.current) / 1000);
    }

    const callData = {
      type: isAudioOnly ? 'audio' : 'video',
      duration,
      status,
      callerName: customData.callerName || 'Usuário'
    };

    console.log('📝 Registrando log de chamada:', callData);
    await sendCallLogMessage(client, targetUserId, callData);
  };

  // Função para encerrar chamada
  const handleEndCall = async () => {
    if (call) {
      await call.leave();
    }
    onClose();
  };

  // Layout minimizado (similar ao WhatsApp/Facebook)
  if (isMinimized) {
    // Pegar nome do primeiro participante remoto (quem você está chamando)
    const remoteName = remoteParticipants[0]?.name || remoteParticipants[0]?.userId || 'Usuário';

    return (
      <div className="fixed bottom-20 right-4 z-50">
        <div className="bg-gray-900 rounded-lg shadow-xl w-64 h-36 overflow-hidden">
          {localParticipant && (
            <div className="relative w-full h-full">
              <ParticipantView
                participant={localParticipant}
                className="w-full h-full object-cover"
              />
              {/* Overlay com controles mínimos */}
              <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col justify-between p-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-white text-sm font-semibold truncate">
                      {remoteName}
                    </div>
                    <div className="text-white text-xs opacity-80">
                      {isAudioOnly ? 'Chamada de áudio' : 'Chamada de vídeo'}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMinimized(false)}
                    className="bg-black bg-opacity-50 rounded-full p-1 ml-2"
                  >
                    <Maximize2 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => call.microphone.toggle()}
                    className={`p-2 rounded-full ${call.microphone.status === 'enabled' ? 'bg-green-600' : 'bg-red-600'
                      }`}
                  >
                    {call.microphone.status === 'enabled' ? (
                      <Mic className="w-4 h-4 text-white" />
                    ) : (
                      <MicOff className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="bg-red-600 p-2 rounded-full"
                  >
                    <PhoneOff className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
        <div className="flex items-center space-x-3">
          {remoteParticipants[0] && (
            <>
              {remoteParticipants[0].image && (
                <img
                  src={remoteParticipants[0].image}
                  alt={remoteParticipants[0].name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <div className="font-medium">
                  {remoteParticipants[0]?.name || 'Usuário'}
                </div>
                <div className="text-sm text-gray-400">
                  {callingState === CallingState.JOINED && participantCount > 1
                    ? 'Conectado'
                    : 'Conectando...'}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-gray-800 rounded-full"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-800 rounded-full"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conteúdo principal da chamada */}
      <div className="flex-1 relative">
        {callingState === CallingState.JOINED ? (
          isAudioOnly ? (
            // Layout apenas áudio
            <AudioCallLayout
              localParticipant={localParticipant}
              remoteParticipants={remoteParticipants}
            />
          ) : (
            // Layout de vídeo usando componente do SDK
            <SpeakerLayout participantsBarPosition="bottom" />
          )
        ) : (
          // Estado de carregamento/conectando
          <ConnectingState
            remoteParticipant={remoteParticipants[0]}
            isAudioOnly={isAudioOnly}
          />
        )}
      </div>

      {/* Controles de chamada */}
      <div className="p-4 bg-gray-900">
        <CustomCallControls
          call={call}
          onEndCall={handleEndCall}
          isAudioOnly={isAudioOnly}
        />
      </div>

      {/* Panel de configurações */}
      {showSettings && (
        <CallSettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

// Layout apenas áudio (similar ao WhatsApp)
const AudioCallLayout = ({ localParticipant, remoteParticipants }) => {
  return (
    <div className="h-full bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center text-white">
      {/* Renderizar participante remoto com áudio (invisível mas necessário para o áudio funcionar) */}
      {remoteParticipants[0] && (
        <>
          {/* ParticipantView com áudio - oculto visualmente mas renderizado para reproduzir áudio */}
          <div className="absolute opacity-0 pointer-events-none" style={{ width: '1px', height: '1px' }}>
            <ParticipantView
              participant={remoteParticipants[0]}
            />
          </div>

          {/* UI visual da chamada de áudio */}
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden bg-gray-600">
              {remoteParticipants[0].image ? (
                <img
                  src={remoteParticipants[0].image}
                  alt={remoteParticipants[0].name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
                  {remoteParticipants[0].name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              {remoteParticipants[0].name || 'Usuário'}
            </h2>
            <p className="text-lg text-gray-300">Chamada de áudio</p>

            {/* Indicador de áudio ativo */}
            <div className="mt-4 flex justify-center items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-green-400 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 20 + 20}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Estado de conectando
const ConnectingState = ({ remoteParticipant, isAudioOnly }) => {
  return (
    <div className="h-full bg-gray-800 flex flex-col items-center justify-center text-white">
      <div className="text-center">
        {remoteParticipant && (
          <>
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-600">
              {remoteParticipant.image ? (
                <img
                  src={remoteParticipant.image}
                  alt={remoteParticipant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                  {remoteParticipant.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {remoteParticipant.name || 'Usuário'}
            </h2>
          </>
        )}
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span className="text-lg">
            Conectando {isAudioOnly ? 'chamada de áudio' : 'chamada de vídeo'}...
          </span>
        </div>
      </div>
    </div>
  );
};

// Controles customizados
const CustomCallControls = ({ call, onEndCall, isAudioOnly }) => {
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();

  return (
    <div className="flex justify-center items-center space-x-4">
      {/* Microfone */}
      <button
        onClick={() => call.microphone.toggle()}
        className={`p-3 rounded-full transition-colors ${!isMicMuted
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-red-600 hover:bg-red-700'
          }`}
      >
        {!isMicMuted ? (
          <Mic className="w-6 h-6 text-white" />
        ) : (
          <MicOff className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Câmera (apenas se não for áudio only) */}
      {!isAudioOnly && (
        <button
          onClick={() => call.camera.toggle()}
          className={`p-3 rounded-full transition-colors ${!isCamMuted
              ? 'bg-gray-700 hover:bg-gray-600'
              : 'bg-red-600 hover:bg-red-700'
            }`}
        >
          {!isCamMuted ? (
            <Video className="w-6 h-6 text-white" />
          ) : (
            <VideoOff className="w-6 h-6 text-white" />
          )}
        </button>
      )}

      {/* Encerrar chamada */}
      <button
        onClick={onEndCall}
        className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
      >
        <PhoneOff className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};

// Panel de configurações
const CallSettingsPanel = ({ onClose }) => {
  return (
    <div className="absolute top-16 right-4 bg-gray-800 rounded-lg shadow-xl p-4 w-64 text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Configurações</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Cancelamento de ruído</span>
          <button className="bg-blue-600 text-xs px-2 py-1 rounded">Ativar</button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Qualidade de vídeo</span>
          <select className="bg-gray-700 text-xs rounded px-2 py-1">
            <option>Auto</option>
            <option>HD</option>
            <option>SD</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Gravação</span>
          <button className="text-gray-400 text-xs">Desabilitado</button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
