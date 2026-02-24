/**
 * Video Context Value Types and Interfaces
 * 
 * Este arquivo define os tipos e interfaces usados pelo VideoContext
 * para manter consistência e documentar as funcionalidades disponíveis.
 */

/**
 * Estados possíveis de uma chamada
 */
export const CallStates = {
  IDLE: 'idle',
  RINGING: 'ringing', 
  JOINING: 'joining',
  JOINED: 'joined',
  LEFT: 'left',
  RECONNECTING: 'reconnecting'
};

/**
 * Tipos de chamada suportados
 */
export const CallTypes = {
  AUDIO: 'audio',
  VIDEO: 'video',
  SCREEN_SHARE: 'screen_share'
};

/**
 * Configurações padrão para chamadas
 */
export const DEFAULT_CALL_SETTINGS = {
  audio: {
    enabled: true,
    noiseCancellation: true,
    echoCancellation: true,
    autoGainControl: true
  },
  video: {
    enabled: true,
    maxResolution: '720p',
    frameRate: 30,
    facingMode: 'user' // 'user' ou 'environment'
  },
  recording: {
    enabled: false,
    autoStart: false,
    storage: 'stream-s3'
  },
  transcription: {
    enabled: false,
    language: 'pt'
  }
};

/**
 * Estrutura do valor do contexto de vídeo
 */
export const createVideoContextValue = ({
  videoClient,
  isInitializing,
  createAudioCall,
  createVideoCall,
  joinCall,
  endCall,
  initializeVideoClient
}) => ({
  // Cliente do GetStream Video
  videoClient,
  
  // Estados
  isInitializing,
  isConnected: !!videoClient?.user,
  
  // Funcionalidades principais
  createAudioCall,
  createVideoCall,
  joinCall,
  endCall,
  initializeVideoClient,
  
  // Utilitários
  isVideoEnabled: () => {
    const enabled = import.meta.env.VITE_ENABLE_VIDEO_CALLS;
    return enabled === 'true' || enabled === true;
  },
  
  isAudioEnabled: () => {
    const enabled = import.meta.env.VITE_ENABLE_AUDIO_CALLS;
    return enabled === 'true' || enabled === true;
  },
  
  getCallSettings: (type = 'video') => ({
    ...DEFAULT_CALL_SETTINGS,
    video: {
      ...DEFAULT_CALL_SETTINGS.video,
      enabled: type === 'video'
    }
  }),
  
  // Configurações avançadas
  enableNoiseCancellation: import.meta.env.VITE_ENABLE_NOISE_CANCELLATION === 'true',
  maxCallDuration: parseInt(import.meta.env.VITE_MAX_CALL_DURATION) || 3600,
  defaultVideoQuality: import.meta.env.VITE_DEFAULT_VIDEO_QUALITY || '720p'
});

/**
 * Hook para validar se o usuário pode fazer chamadas
 */
export const validateCallPermissions = (currentUser, targetUser) => {
  if (!currentUser || !targetUser) {
    return { canCall: false, reason: 'Usuários não encontrados' };
  }
  
  if (currentUser.uid === targetUser.uid) {
    return { canCall: false, reason: 'Não é possível ligar para si mesmo' };
  }
  
  // Verificar se o usuário está online (implementar lógica específica)
  // const isOnline = checkUserOnlineStatus(targetUser.uid);
  
  return { canCall: true, reason: null };
};

/**
 * Utilitários para formatação de tempo de chamada
 */
export const formatCallDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Configurações de qualidade de vídeo
 */
export const VIDEO_QUALITY_PRESETS = {
  '480p': { width: 854, height: 480, maxBitrate: 1000 },
  '720p': { width: 1280, height: 720, maxBitrate: 2000 },
  '1080p': { width: 1920, height: 1080, maxBitrate: 4000 }
};

/**
 * Eventos personalizados de chamada
 */
export const CALL_EVENTS = {
  CALL_STARTED: 'call:started',
  CALL_ENDED: 'call:ended',
  CALL_INCOMING: 'call:incoming',
  CALL_ACCEPTED: 'call:accepted',
  CALL_REJECTED: 'call:rejected',
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  MEDIA_TOGGLE: 'media:toggle'
};
