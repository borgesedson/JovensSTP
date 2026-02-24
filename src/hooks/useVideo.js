import { useContext } from 'react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { VideoContext } from '../contexts/VideoContext';

// Hook principal para acessar funcionalidades de vídeo
export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within VideoProvider');
  }
  return context;
};

// Hook para estado da chamada atual
export const useCallState = () => {
  const call = useCall();
  const {
    useCallCallingState,
    useLocalParticipant,
    useRemoteParticipants,
    useParticipantCount,
    useIsCallRecordingInProgress,
    useMicrophoneState,
    useCameraState,
    useSpeakerState,
    useCallStats
  } = useCallStateHooks();

  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const participantCount = useParticipantCount();
  const isRecording = useIsCallRecordingInProgress();
  const microphoneState = useMicrophoneState();
  const cameraState = useCameraState();
  const speakerState = useSpeakerState();
  const callStats = useCallStats();

  return {
    call,
    callingState,
    localParticipant,
    remoteParticipants,
    participantCount,
    isRecording,
    microphoneState,
    cameraState,
    speakerState,
    callStats
  };
};

// Hook para controles de mídia
export const useMediaControls = () => {
  const { microphoneState, cameraState, speakerState } = useCallState();

  const toggleMicrophone = async () => {
    try {
      if (microphoneState.hasBrowserPermission) {
        await microphoneState.microphone.toggle();
      } else {
        await microphoneState.microphone.enable();
      }
    } catch (error) {
      console.error('Erro ao alternar microfone:', error);
    }
  };

  const toggleCamera = async () => {
    try {
      if (cameraState.hasBrowserPermission) {
        await cameraState.camera.toggle();
      } else {
        await cameraState.camera.enable();
      }
    } catch (error) {
      console.error('Erro ao alternar câmera:', error);
    }
  };

  const toggleSpeaker = async () => {
    try {
      await speakerState.speaker.toggle();
    } catch (error) {
      console.error('Erro ao alternar alto-falante:', error);
    }
  };

  return {
    // Estados
    isMicrophoneEnabled: microphoneState.isEnabled,
    isCameraEnabled: cameraState.isEnabled,
    isSpeakerEnabled: speakerState.isEnabled,
    hasMicrophonePermission: microphoneState.hasBrowserPermission,
    hasCameraPermission: cameraState.hasBrowserPermission,
    
    // Controles
    toggleMicrophone,
    toggleCamera,
    toggleSpeaker,
    
    // Dispositivos
    microphones: microphoneState.devices,
    cameras: cameraState.devices,
    speakers: speakerState.devices,
    
    // Seleção de dispositivos
    selectMicrophone: microphoneState.microphone.select,
    selectCamera: cameraState.camera.select,
    selectSpeaker: speakerState.speaker.select
  };
};

// Hook para iniciar chamadas
export const useCallActions = () => {
  const { createAudioCall, createVideoCall, endCall } = useVideo();

  const startAudioCall = async (targetUserId) => {
    try {
      // createAudioCall já faz o join automaticamente
      const newCall = await createAudioCall(targetUserId);
      return newCall;
    } catch (error) {
      console.error('Erro ao iniciar chamada de áudio:', error);
      throw error;
    }
  };

  const startVideoCall = async (targetUserId) => {
    try {
      // createVideoCall já faz o join automaticamente
      const newCall = await createVideoCall(targetUserId);
      return newCall;
    } catch (error) {
      console.error('Erro ao iniciar chamada de vídeo:', error);
      throw error;
    }
  };

  const leaveCall = async (call) => {
    if (call) {
      try {
        await endCall(call);
      } catch (error) {
        console.error('Erro ao sair da chamada:', error);
        throw error;
      }
    }
  };

  return {
    startAudioCall,
    startVideoCall,
    leaveCall
  };
};
