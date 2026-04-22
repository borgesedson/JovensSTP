import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { StreamVideo, StreamVideoClient } from '@stream-io/video-react-sdk';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';

// Import Stream Video Styles
import '@stream-io/video-react-sdk/dist/css/styles.css';

export const VideoContext = createContext();

const STREAM_VIDEO_API_KEY = import.meta.env.VITE_STREAM_VIDEO_API_KEY || import.meta.env.VITE_STREAM_API_KEY;

export const VideoProvider = ({ children }) => {
  const { user } = useAuth();
  const [videoClient, setVideoClient] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Função helper para buscar dados do usuário
  const getUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { uid: userId, ...userDoc.data() };
      }
      return { uid: userId, displayName: 'Utilizador', photoURL: null };
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return { uid: userId, displayName: 'Utilizador', photoURL: null };
    }
  };

  // Função para gerar token via Cloud Function
  const generateUserToken = async (userId) => {
    try {
      const createToken = httpsCallable(functions, 'v4_createVideoToken');
      console.log('🎥 Gerando token de vídeo para:', userId);
      const result = await createToken({ userId });

      if (result.data && result.data.token) {
        return result.data.token;
      } else {
        throw new Error('Função retornou formato de dado inesperado');
      }
    } catch (error) {
      console.error('❌ Falha ao gerar token de vídeo:', error.message);

      if (error.code === 'not-found') {
        console.error('❌ Cloud Function "v4_createVideoToken" não foi encontrada. Verifique o deploy.');
      } else if (error.code === 'permission-denied') {
        console.error('❌ Permissão negada. Verifique as regras de App Check/CORS.');
      }

      throw error;
    }
  };

  // Função para inicializar o cliente de vídeo
  const initializeVideoClient = useCallback(async () => {
    if (!user || videoClient) return;

    setIsInitializing(true);
    try {
      // Gerar token real via Cloud Function
      const token = await generateUserToken(user.uid);

      const client = StreamVideoClient.getOrCreateInstance({
        apiKey: STREAM_VIDEO_API_KEY,
        user: {
          id: user.uid,
          name: user.displayName || user.email,
          image: user.photoURL
        },
        token,
        // tokenProvider: re-fetch token quando expirar
        tokenProvider: () => generateUserToken(user.uid),
      });

      setVideoClient(client);
    } catch (error) {
      console.error('Erro ao inicializar cliente de vídeo:', error);
      toast.error('Erro ao conectar sistema de vídeo. Verifique a tua conexão.');
    } finally {
      setIsInitializing(false);
    }
  }, [user, videoClient]);


  // Função para criar chamada de áudio
  const createAudioCall = async (targetUserId) => {
    if (!videoClient) {
      await initializeVideoClient();
      return;
    }

    try {
      // ✅ NOVO: Garantir que o outro usuário existe no Stream antes de criar chamada
      try {
        const ensureUserFn = httpsCallable(functions, 'v4_ensureStreamUsers');
        await ensureUserFn({ userIds: [targetUserId] });
        console.log('✅ Usuário alvo sincronizado/verificado no Stream para Chamada:', targetUserId);
      } catch (ensureErr) {
        console.warn('⚠️ Falha ao garantir existência do usuário no Stream para Chamada:', ensureErr);
      }

      // Buscar dados do usuário target
      const targetUser = await getUserData(targetUserId);

      // ID curto (máximo 64 caracteres)
      const timestamp = Date.now().toString(36);
      const callId = `a-${timestamp}`;
      const call = videoClient.call('default', callId);

      // Criar a chamada com metadados e timeout de 5 minutos
      await call.getOrCreate({
        ring: true,
        data: {
          members: [
            { user_id: user.uid },
            { user_id: targetUserId }
          ],
          custom: {
            type: 'audio',
            callId: callId,
            callerName: user.displayName || user.email,
            callerPhoto: user.photoURL || null,
            callerId: user.uid,
            targetName: targetUser.displayName || 'Utilizador',
            targetPhoto: targetUser.photoURL || null
          }
        },
        settings_override: {
          ring: {
            auto_cancel_timeout_ms: 60000,        // 1 minuto
            incoming_call_timeout_ms: 30000,       // 30 segundos para aceitar
            missed_call_timeout_ms: 60000          // 1 minuto
          }
        }
      });

      // Entrar na chamada
      await call.join();

      // Desabilitar câmera e garantir que microfone está habilitado
      await call.camera.disable();
      await call.microphone.enable(); // Garantir que áudio está ativo

      // Enviar notificação push para o outro usuário (opcional - não bloqueia se falhar)
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await import('../services/firebase');
        const functions = getFunctions(app);
        const sendCallNotification = httpsCallable(functions, 'v4_sendCallNotification');

        sendCallNotification({
          targetUserId: targetUserId,
          callType: 'audio',
          callId: callId,
          callerName: user.displayName || user.email,
          callerPhoto: user.photoURL
        }).catch(err => console.warn('Notificação push falhou (opcional):', err));
      } catch (notifError) {
        console.warn('Erro ao configurar notificação push:', notifError);
      }

      return { call, targetUser };
    } catch (error) {
      console.error('Erro ao criar chamada de áudio:', error);
      toast.error('Erro ao iniciar chamada de áudio');
      throw error;
    }
  };

  // Função para criar chamada de vídeo
  const createVideoCall = async (targetUserId) => {
    if (!videoClient) {
      await initializeVideoClient();
      return;
    }

    try {
      // ✅ NOVO: Garantir que o outro usuário existe no Stream antes de criar chamada
      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('../services/firebase');
        const ensureUserFn = httpsCallable(functions, 'v4_ensureStreamUsers');
        await ensureUserFn({ userIds: [targetUserId] });
        console.log('✅ Usuário alvo sincronizado/verificado no Stream para Vídeo:', targetUserId);
      } catch (ensureErr) {
        console.warn('⚠️ Falha ao garantir existência do usuário no Stream para Vídeo:', ensureErr);
      }

      // Buscar dados do usuário target
      const targetUser = await getUserData(targetUserId);

      // ID curto (máximo 64 caracteres)
      const timestamp = Date.now().toString(36);
      const callId = `v-${timestamp}`;
      const call = videoClient.call('default', callId);

      // Criar a chamada com metadados e timeout de 5 minutos
      await call.getOrCreate({
        ring: true,
        data: {
          members: [
            { user_id: user.uid },
            { user_id: targetUserId }
          ],
          custom: {
            type: 'video',
            callId: callId,
            callerName: user.displayName || user.email,
            callerPhoto: user.photoURL || null,
            callerId: user.uid,
            targetName: targetUser.displayName || 'Utilizador',
            targetPhoto: targetUser.photoURL || null
          }
        },
        settings_override: {
          ring: {
            auto_cancel_timeout_ms: 60000,        // 1 minuto
            incoming_call_timeout_ms: 30000,       // 30 segundos para aceitar
            missed_call_timeout_ms: 60000          // 1 minuto
          }
        }
      });

      // Entrar na chamada
      await call.join();

      // Enviar notificação push para o outro usuário (opcional - não bloqueia se falhar)
      try {
        const sendCallNotification = httpsCallable(functions, 'v4_notifyIncomingCall');

        sendCallNotification({
          targetUserId: targetUserId,
          callType: 'video',
          callId: callId,
          callerName: user.displayName || user.email,
          callerPhoto: user.photoURL
        }).catch(err => console.warn('Notificação push falhou (opcional):', err));
      } catch (notifError) {
        console.warn('Erro ao configurar notificação push:', notifError);
      }

      return { call, targetUser };
    } catch (error) {
      console.error('Erro ao criar chamada de vídeo:', error);
      toast.error('Erro ao iniciar chamada de vídeo');
      throw error;
    }
  };

  // Função para participar de uma chamada existente
  const joinCall = async (call, enableVideo = true) => {
    try {
      await call.join({ create: false });

      if (!enableVideo) {
        await call.camera.disable();
      }

      return call;
    } catch (error) {
      console.error('Erro ao entrar na chamada:', error);
      toast.error('Erro ao entrar na chamada');
      throw error;
    }
  };

  // Função para encerrar chamada
  const endCall = async (call) => {
    try {
      await call.leave();
    } catch (error) {
      console.error('Erro ao encerrar chamada:', error);
      toast.error('Erro ao encerrar chamada');
    }
  };

  // --- NOVAS FUNÇÕES PARA O MEET (CONFERÊNCIA) ---

  // Função para iniciar gravação
  const startRecording = async (callOrCallId) => {
    try {
      let call = callOrCallId;
      if (typeof callOrCallId === 'string' && videoClient) {
        call = videoClient.call('default', callOrCallId);
      }
      
      if (call && typeof call.startRecording === 'function') {
        await call.startRecording();
        toast.success('Gravação iniciada');
      } else {
        throw new Error('Objeto Call inválido para gravação');
      }
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast.error('Falha ao iniciar gravação. Verifique as permissões.');
    }
  };

  // Função para parar gravação
  const stopRecording = async (callOrCallId) => {
    try {
      let call = callOrCallId;
      if (typeof callOrCallId === 'string' && videoClient) {
        call = videoClient.call('default', callOrCallId);
      }

      if (call && typeof call.stopRecording === 'function') {
        await call.stopRecording();
        toast.success('Gravação interrompida');
      }
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
    }
  };

  // Função para listar gravações de uma chamada
  const getRecordings = async (callId) => {
    if (!videoClient) return [];
    try {
      const call = videoClient.call('default', callId);
      const response = await call.queryRecordings();
      return response.recordings || [];
    } catch (error) {
      console.error('Erro ao buscar gravações:', error);
      return [];
    }
  };

  // Função para criar uma reunião formal (Google Meet-like)
  const createMeeting = async (title = 'Nova Reunião', description = '') => {
    if (!videoClient || !user) {
      toast.error('Sistema não inicializado ou usuário não logado');
      return null;
    }

    try {
      // 1. Criar ID da chamada
      const timestamp = Date.now().toString(36);
      const callId = `meet-${timestamp}`;
      
      // 2. Persistir a reunião no Firestore via Cloud Function
      try {
        const createMeetingFn = httpsCallable(functions, 'v4_createMeeting');
        await createMeetingFn({
          callId,
          title,
          description,
          startTime: new Date().toISOString()
        });
        console.log('✅ Reunião registada no Firestore com sucesso!');
      } catch (dbErr) {
        console.warn('⚠️ Falha ao salvar reunião na VPS (Prosseguindo com a chamada):', dbErr);
      }

      // 3. Criar sala no Stream Video
      const call = videoClient.call('default', callId);
      await call.getOrCreate({
        ring: false,
        notify: false,
        data: {
          members: [{ user_id: user.uid }],
          custom: {
            title,
            description,
            type: 'meet',
            hostId: user.uid
          }
        }
      });

      toast.success('Reunião criada com sucesso!');
      return callId;
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      toast.error('Erro ao iniciar reunião');
      throw error;
    }
  };

  // Inicializar cliente quando usuário estiver autenticado
  useEffect(() => {
    if (user && !videoClient && !isInitializing) {
      initializeVideoClient();
    }
  }, [user, videoClient, isInitializing, initializeVideoClient]);

  // Limpar cliente quando usuário fizer logout
  useEffect(() => {
    if (!user && videoClient) {
      videoClient.disconnectUser();
      setVideoClient(null);
    }
  }, [user, videoClient]);

  const value = useMemo(() => ({
    videoClient,
    isInitializing,
    createAudioCall,
    createVideoCall,
    joinCall,
    endCall,
    startRecording,
    stopRecording,
    getRecordings,
    createMeeting,
    initializeVideoClient
  }), [
    videoClient,
    isInitializing,
    createAudioCall,
    createVideoCall,
    joinCall,
    endCall,
    startRecording,
    stopRecording,
    getRecordings,
    createMeeting,
    initializeVideoClient
  ]);

  // Sempre que houver um cliente ativo, manter <StreamVideo> ao redor dos children
  // Isso evita race ao fazer logout (quando user fica null antes do client ser desmontado)
  if (videoClient) {
    return (
      <VideoContext.Provider value={value}>
        <StreamVideo client={videoClient}>
          {children}
        </StreamVideo>
      </VideoContext.Provider>
    );
  }

  // Se não há usuário (ou ainda inicializando), renderizar apenas os children sem StreamVideo
  if (!user) {
    return (
      <VideoContext.Provider value={value}>
        {children}
      </VideoContext.Provider>
    );
  }

  // Loading state - ainda não há videoClient
  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
};

// HOOK
export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within VideoProvider');
  }
  return context;
};

// Wrapper para componentes que precisam estar dentro de <StreamVideo> (Incoming Call, etc)
export const StreamVideoWrapper = ({ children }) => {
  const { videoClient } = useVideo();

  // Só renderiza se houver videoClient ativo
  if (!videoClient) return null;

  return <>{children}</>;
};
