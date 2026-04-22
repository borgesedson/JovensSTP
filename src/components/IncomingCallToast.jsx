import React, { useState, useEffect } from 'react';
import { StreamCall, useCalls, CallingState, useCallStateHooks } from '@stream-io/video-react-sdk';
import { useStreamChat } from '../hooks/useStreamChat';
import VideoCallModal from './VideoCallModal';
import { IncomingCallScreen } from './IncomingCallScreen';
import { notificationSounds } from '../services/notificationSounds';
import { sendCallLogMessage } from '../services/callLogs';

const IncomingCallToast = () => {
  const calls = useCalls();
  const [persistentCalls, setPersistentCalls] = useState([]);
  const { chatClient: client } = useStreamChat();

  // Detectar novas chamadas e adicioná-las à lista persistente
  useEffect(() => {
    const incomingCalls = calls.filter(
      (call) => !call.isCreatedByMe &&
        (call.state.callingState === CallingState.RINGING ||
          call.state.callingState === CallingState.JOINING) &&
        !call.id.startsWith('meet-')
    );

    // Adicionar novas chamadas que ainda não estão na lista persistente
    incomingCalls.forEach(call => {
      if (!persistentCalls.find(pc => pc.cid === call.cid)) {
        setPersistentCalls(prev => [...prev, call]);
        // Tocar som de chamada recebida
        notificationSounds.playCallSound();
      }
    });
  }, [calls, persistentCalls]);

  // Remover chamadas que foram explicitamente encerradas e registrar missed
  useEffect(() => {
    setPersistentCalls(prev => {
      return prev.filter(call => {
        const currentCall = calls.find(c => c.cid === call.cid);

        // Se a chamada foi cancelada/encerrada sem ser atendida
        if (!currentCall ||
          currentCall.state.callingState === CallingState.LEFT ||
          currentCall.state.callingState === CallingState.OFFLINE) {

          // Verificar se foi atendida olhando os participants
          const wasAnswered = call.state?.participants?.length > 1;

          if (!wasAnswered) {
            // Chamada não atendida - registrar log
            const customData = call.state?.custom || {};
            const callerId = customData.callerId;
            const callerName = customData.callerName || 'Usuário';
            const callType = customData.type || 'video';

            if (client && callerId) {
              sendCallLogMessage(client, callerId, {
                type: callType,
                duration: 0,
                status: 'missed',
                callerName: callerName
              }).catch(err => console.error('Erro ao registrar missed call:', err));
            }
          }

          return false; // Remover da lista
        }

        return true; // Manter na lista
      });
    });
  }, [calls, client]);

  if (persistentCalls.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[60] space-y-3">
      {persistentCalls.map((call) => (
        <StreamCall key={call.cid} call={call}>
          <IncomingToastCard
            call={call}
            onDismiss={() => setPersistentCalls(prev => prev.filter(c => c.cid !== call.cid))}
          />
        </StreamCall>
      ))}
    </div>
  );
};

const IncomingToastCard = ({ call, onDismiss }) => {
  const { useCallCustomData, useParticipants, useCallCallingState } = useCallStateHooks();
  const customData = useCallCustomData();
  const participants = useParticipants();
  const callingState = useCallCallingState();
  const { chatClient: client } = useStreamChat();
  const [showModal, setShowModal] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Debug: ver o que vem nos custom data
  console.log('📞 Custom Data:', customData);
  console.log('👥 Participants:', participants);
  console.log('🆔 Current User ID:', call.currentUserId);
  console.log('📱 Calling State:', callingState);

  const caller = participants.find((p) => p.userId !== call.currentUserId);

  // Tentar pegar do custom data primeiro, depois do participant
  const callerName = customData?.callerName || caller?.name || caller?.user?.name || caller?.userId || 'Utilizador';
  const callerImage = customData?.callerPhoto || caller?.image;
  const callerId = customData?.callerId || caller?.userId;
  const callType = customData?.type || 'video';
  const isVideoCall = callType === 'video';

  // Dados do caller formatados
  const callerUser = {
    displayName: callerName,
    photoURL: callerImage,
    uid: callerId
  };

  const handleAccept = async () => {
    setHasInteracted(true);
    // Parar som de chamada
    notificationSounds.stopCallSound();
    await call.join();
    if (!isVideoCall) {
      await call.camera.disable();
      await call.microphone.enable();
    }
    setShowModal(true);
  };

  const handleReject = async () => {
    setHasInteracted(true);
    // Parar som de chamada
    notificationSounds.stopCallSound();

    // Registrar log de chamada recusada
    if (client && callerId) {
      const callData = {
        type: isVideoCall ? 'video' : 'audio',
        duration: 0,
        status: 'declined',
        callerName: callerName
      };
      await sendCallLogMessage(client, callerId, callData);
    }

    try {
      await call.leave({ reject: true, reason: 'decline' });
    } catch (error) {
      console.error('Erro ao rejeitar chamada:', error);
    }
    // Remover da lista após rejeitar
    if (onDismiss) {
      onDismiss();
    }
  };

  // Se já interagiu e rejeitou, não mostrar nada
  if (hasInteracted && !showModal) {
    return null;
  }

  if (showModal) {
    return (
      <VideoCallModal call={call} onClose={() => setShowModal(false)} isAudioOnly={!isVideoCall} />
    );
  }

  // Mostrar tela completa de chamada recebida
  return (
    <IncomingCallScreen
      callerUser={callerUser}
      callType={callType}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
};

export default IncomingCallToast;
