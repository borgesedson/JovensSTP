import { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react'
import { X, Mic, MicOff, Hand, UserPlus, UserMinus, Shield } from 'lucide-react'
import { db } from '../services/firebase'
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { useVideo } from '../contexts/VideoContext'
import { StreamCall, useCallStateHooks, ParticipantView } from '@stream-io/video-react-sdk'

export const AudioRoomModal = ({ room: initialRoom, onClose }) => {
  const { user } = useAuth();
  const [room, setRoom] = useState(initialRoom);
  const [isMuted, setIsMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { videoClient } = useVideo()
  const [call, setCall] = useState(null)
  const isLeavingRef = useRef(false)

  const isHost = room.hostId === user.uid;
  const isSpeaker = room.speakerIds?.includes(user.uid);
  const userParticipant = room.participants?.find(p => p.uid === user.uid);

  // Listen to room updates
  useEffect(() => {
    if (!initialRoom.id) return;

    const unsub = onSnapshot(doc(db, 'audioRooms', initialRoom.id), (doc) => {
      if (!doc.exists()) {
        toast.error('Sala encerrada pelo host');
        onClose();
        return;
      }
      setRoom({ ...doc.data(), id: doc.id });
    });

    return () => unsub();
  }, [initialRoom.id, onClose]);

  // Initialize Stream Video call
  useEffect(() => {
    if (!videoClient || !initialRoom.id) return
    const callId = initialRoom.id
    const c = videoClient.call('default', callId)
    const connect = async () => {
      try {
        // ✅ NOVO: Garantir que o usuário está no Stream antes de entrar no Live
        try {
          const { getFunctions, httpsCallable } = await import('firebase/functions');
          const { app } = await import('../services/firebase');
          const functions = getFunctions(app);
          const ensureUserFn = httpsCallable(functions, 'v4_ensureStreamUsers');
          await ensureUserFn({ userIds: [user.uid] });
          console.log('✅ Usuário host/participante sincronizado no Stream para Live:', user.uid);
        } catch (ensureErr) {
          console.warn('⚠️ Falha ao garantir sincronização no Stream para Live:', ensureErr);
        }

        // Get or create call
        await c.getOrCreate({
          data: {
            custom: {
              type: 'audio_live',
              roomTitle: initialRoom.title
            }
          }
        })
        // Join the call (we start muted by default for listeners)
        await c.join({ create: false })
        // Disable camera immediately (audio-only)
        await c.camera.disable()

        // Host gets speaker role in Stream Video sense
        if (isHost) {
          try {
            await c.microphone.enable()
            setIsMuted(false)
            // Ensure the host has 'speaker' capability in the call
            await c.updateCallMembers({
              update_members: [{ user_id: user.uid, role: 'speaker' }]
            })
          } catch (err) {
            console.warn('Não foi possível ativar microfone ou permissões para o host:', err)
          }
        } else {
          await c.microphone.disable()
          setIsMuted(true)
        }
        setCall(c)
        console.log('✅ Conectado ao call de áudio:', callId)
      } catch (e) {
        console.error('Erro ao entrar no call de áudio', e)
        toast.error('Erro na stream de áudio')
      }
    }
    connect()
    // Cleanup on unmount
    return () => {
      if (c && !isLeavingRef.current) {
        isLeavingRef.current = true;
        c.leave().catch(err => {
          // Ignorar erro se já saiu
          if (!err.message?.includes('already been left')) {
            console.error('Erro ao sair do call:', err)
          }
        })
      }
    }
  }, [videoClient, initialRoom.id, user?.uid, isHost])

  // Join room on mount (Firestore presence metadata)
  useEffect(() => {
    const joinRoom = async () => {
      if (!initialRoom.id) return;

      const alreadyJoined = initialRoom.participants?.some(p => p.uid === user.uid);
      if (alreadyJoined) return;

      try {
        const roomRef = doc(db, 'audioRooms', initialRoom.id);
        await updateDoc(roomRef, {
          participants: arrayUnion({
            uid: user.uid,
            name: user.displayName || 'Usuário',
            avatar: user.photoURL || null,
            role: 'listener',
            isSpeaking: false,
            handRaised: false
          }),
          listenerIds: arrayUnion(user.uid)
        });
      } catch (error) {
        console.error('Erro ao entrar na sala:', error);
      }
    };

    joinRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoom.id]);

  const handleLeaveRoom = async () => {
    // Prevenir múltiplas tentativas de sair
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    try {
      const roomRef = doc(db, 'audioRooms', room.id);

      // Leave Stream call first
      if (call) {
        try {
          await call.leave()
        } catch (err) {
          // Ignorar erro se já saiu
          if (!err.message?.includes('already been left')) {
            console.error('Erro ao sair do call:', err)
          }
        }
      }

      if (isHost) {
        // Host encerra a sala completamente
        if (call) {
          try {
            await call.endCall()
          } catch (err) {
            console.error('Erro ao encerrar call:', err)
          }
        }
        await deleteDoc(roomRef);
        toast.success('Sala encerrada');
      } else {
        // Participante sai
        await updateDoc(roomRef, {
          participants: arrayRemove(userParticipant),
          speakerIds: arrayRemove(user.uid),
          listenerIds: arrayRemove(user.uid)
        });
      }

      onClose();
    } catch (error) {
      console.error('Erro ao sair da sala:', error);
      toast.error('Erro ao sair da sala');
    }
  };

  const toggleMute = async () => {
    if (!isSpeaker) {
      toast.error('Precisas de permissão para falar')
      return
    }

    try {
      if (!call) {
        toast.error('Conexão de áudio não estabelecida')
        return
      }

      if (isMuted) {
        await call.microphone.enable()
        toast.success('Microfone ativado 🎙️')
      } else {
        await call.microphone.disable()
      }

      setIsMuted(!isMuted)
    } catch (e) {
      console.error('Erro ao alternar microfone', e)
      toast.error('Falha ao alternar microfone')
    }
  }

  const toggleHandRaise = async () => {
    try {
      const roomRef = doc(db, 'audioRooms', room.id);
      const updatedParticipants = room.participants.map(p =>
        p.uid === user.uid ? { ...p, handRaised: !handRaised } : p
      );

      await updateDoc(roomRef, { participants: updatedParticipants });
      setHandRaised(!handRaised);

      if (!handRaised) {
        toast.success('Mão levantada! ✋');
      }
    } catch (error) {
      console.error('Erro ao levantar mão:', error);
    }
  };

  const promoteToSpeaker = async (participantId) => {
    if (!isHost) return;

    try {
      const roomRef = doc(db, 'audioRooms', room.id);
      const updatedParticipants = room.participants.map(p =>
        p.uid === participantId ? { ...p, role: 'speaker', handRaised: false } : p
      );

      await updateDoc(roomRef, {
        participants: updatedParticipants,
        speakerIds: arrayUnion(participantId),
        listenerIds: arrayRemove(participantId)
      });

      // Update Stream call permissions
      if (call) {
        try {
          await call.updateCallMembers({
            update_members: [{
              user_id: participantId,
              role: 'speaker'
            }]
          })
        } catch (e) {
          console.warn('Erro ao atualizar permissões no Stream:', e)
        }
      }

      toast.success('Promovido a speaker 🎙️');
    } catch (error) {
      console.error('Erro ao promover:', error);
      toast.error('Erro ao promover participante');
    }
  };

  const demoteToListener = async (participantId) => {
    if (!isHost) return;

    try {
      const roomRef = doc(db, 'audioRooms', room.id);
      const updatedParticipants = room.participants.map(p =>
        p.uid === participantId ? { ...p, role: 'listener' } : p
      );

      await updateDoc(roomRef, {
        participants: updatedParticipants,
        speakerIds: arrayRemove(participantId),
        listenerIds: arrayUnion(participantId)
      });

      // Update Stream call permissions
      if (call) {
        try {
          await call.updateCallMembers({
            update_members: [{
              user_id: participantId,
              role: 'listener'
            }]
          })
        } catch (e) {
          console.warn('Erro ao atualizar permissões no Stream:', e)
        }
      }

      toast.success('Movido para ouvintes');
    } catch (error) {
      console.error('Erro ao despromover:', error);
      toast.error('Erro ao despromover participante');
    }
  };

  const speakers = room.participants?.filter(p => p.role === 'host' || p.role === 'speaker') || []
  const listeners = room.participants?.filter(p => p.role === 'listener') || []

  // Componente interno para detectar speaking state do Stream e sincronizar (com cautela) com Firestore
  const SpeakingDetector = () => {
    const { useDominantSpeaker } = useCallStateHooks()
    const dominantSpeaker = useDominantSpeaker()
    const lastUpdateRef = useRef(0)
    const lastSpeakerIdRef = useRef(null)

    useEffect(() => {
      // Sincronizar apenas se o speaker mudar e houver um intervalo de segurança de 2s
      if (!dominantSpeaker || !room.id) return

      const now = Date.now()
      if (dominantSpeaker.userId === lastSpeakerIdRef.current && (now - lastUpdateRef.current < 2000)) {
        return
      }

      const updateSpeakingState = async () => {
        try {
          lastUpdateRef.current = now
          lastSpeakerIdRef.current = dominantSpeaker.userId

          const roomRef = doc(db, 'audioRooms', room.id)
          const updatedParticipants = room.participants?.map(p => ({
            ...p,
            isSpeaking: p.uid === dominantSpeaker.userId
          })) || []

          await updateDoc(roomRef, { participants: updatedParticipants })
        } catch (e) {
          console.warn('Erro ao atualizar speaking state (Throttled):', e)
        }
      }

      updateSpeakingState()
    }, [dominantSpeaker, room.id, room.participants])

    return null
  }

  // Componente para renderizar áudio dos participantes remotos
  const AudioRenderer = () => {
    const { useRemoteParticipants } = useCallStateHooks()
    const remoteParticipants = useRemoteParticipants()

    // Renderizar apenas participantes com sessionId válido
    const validParticipants = remoteParticipants.filter(p => p.sessionId)

    return (
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        {validParticipants.map((participant) => (
          <ParticipantView
            key={participant.sessionId}
            participant={participant}
            ParticipantViewUI={null}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {call && (
        <StreamCall call={call}>
          <SpeakingDetector />
          <AudioRenderer />
        </StreamCall>
      )}
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-900/95 backdrop-blur">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{room.title}</h2>
              {room.description && (
                <p className="text-sm text-gray-400 truncate">{room.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{room.participants?.length || 0} participantes</span>
                <span>•</span>
                <span>{room.speakerIds?.length || 0} a falar</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLeaveRoom}
            className="p-2 hover:bg-gray-800 rounded-full transition flex-shrink-0 ml-2"
            title={isHost ? 'Encerrar sala' : 'Sair da sala'}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 overflow-y-auto" style={{ height: 'calc(100% - 10rem)' }}>
        {/* Speakers */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            A falar ({speakers.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {speakers.map((participant) => (
              <div
                key={participant.uid}
                onClick={() => isHost && setSelectedUser(participant)}
                className={`text-center ${isHost ? 'cursor-pointer' : ''}`}
              >
                <div className="relative mb-2">
                  <div className={`w-20 h-20 mx-auto rounded-full overflow-hidden ${participant.isSpeaking ? 'ring-4 ring-green-500' : 'ring-2 ring-gray-600'
                    }`}>
                    {participant.avatar ? (
                      <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-xl font-bold">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {participant.role === 'host' && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                      <Shield size={12} />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{participant.name}</p>
                <p className="text-xs text-gray-400">{participant.role === 'host' ? 'Host' : 'Speaker'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Listeners */}
        {listeners.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              A ouvir ({listeners.length})
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {listeners.map((participant) => (
                <div
                  key={participant.uid}
                  onClick={() => isHost && setSelectedUser(participant)}
                  className={`text-center ${isHost ? 'cursor-pointer' : ''}`}
                >
                  <div className="relative mb-1">
                    <div className="w-14 h-14 mx-auto rounded-full overflow-hidden ring-2 ring-gray-700">
                      {participant.avatar ? (
                        <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-sm font-bold">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {participant.handRaised && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 animate-bounce">
                        <Hand size={10} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs truncate">{participant.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 p-4 pb-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
          {/* Controles principais */}
          <div className="flex items-center justify-center gap-4">
            {isSpeaker && (
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition shadow-lg flex items-center justify-center ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                title={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            )}

            {!isSpeaker && !isHost && (
              <button
                onClick={toggleHandRaise}
                className={`p-4 rounded-full transition shadow-lg flex items-center justify-center ${handRaised ? 'bg-yellow-600 hover:bg-yellow-700 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                title={handRaised ? 'Baixar mão' : 'Levantar mão para falar'}
              >
                <Hand size={24} />
              </button>
            )}

            <button
              onClick={handleLeaveRoom}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full font-semibold transition shadow-lg"
              title={isHost ? 'Encerrar sala para todos' : 'Sair da sala'}
            >
              {isHost ? 'Encerrar Sala' : 'Sair'}
            </button>
          </div>

          {/* Indicadores de estado */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {isSpeaker && (
              <span className="flex items-center gap-1">
                {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                {isMuted ? 'Microfone desligado' : 'Podes falar'}
              </span>
            )}
            {!isSpeaker && !isHost && handRaised && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Hand size={12} />
                Mão levantada - aguarda aprovação
              </span>
            )}
            {isHost && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Shield size={12} />
                És o host - clica nos participantes para gerir
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User Action Modal (Host only) */}
      {isHost && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">{selectedUser.name}</h3>
            <div className="space-y-2">
              {selectedUser.role === 'listener' && (
                <button
                  onClick={() => {
                    promoteToSpeaker(selectedUser.uid);
                    setSelectedUser(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition"
                >
                  <UserPlus size={20} />
                  Promover a Speaker
                </button>
              )}
              {selectedUser.role === 'speaker' && (
                <button
                  onClick={() => {
                    demoteToListener(selectedUser.uid);
                    setSelectedUser(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition"
                >
                  <UserMinus size={20} />
                  Mover para Ouvintes
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
