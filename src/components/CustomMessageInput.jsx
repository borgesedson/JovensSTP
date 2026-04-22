import { MessageInput as StreamMessageInput, useMessageInputContext } from 'stream-chat-react'
import { useChannelStateContext } from 'stream-chat-react'
import { useAuth } from '../hooks/useAuth'
import NotificationService from '../services/NotificationService'
import { useEffect, useState, useRef } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import VPSService from '../services/VPSService'

const AudioRecorder = () => {
    const { setText, insertText } = useMessageInputContext();
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await handleTranscription(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            toast.error('Não foi possível acessar o microfone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks to release the microphone
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleTranscription = async (blob) => {
        setIsTranscribing(true);
        const loadingToast = toast.loading('A transcrever áudio...');
        try {
            const data = await VPSService.transcribe(blob);
            
            if (data.text) {
                // Tenta encontrar a caixa de texto nativa do Stream Chat
                const textarea = document.querySelector('.str-chat__textarea textarea') || document.querySelector('textarea');
                
                if (textarea) {
                    // Adiciona um espaço antes se já houver texto
                    const prefix = textarea.value ? ' ' : '';
                    const newText = textarea.value + prefix + data.text;
                    
                    // Hack do React para forçar atualização do value programaticamente
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                    nativeInputValueSetter.call(textarea, newText);
                    
                    // Dispara o evento para o React/StreamChat reconhecer a mudança
                    const event = new Event('input', { bubbles: true });
                    textarea.dispatchEvent(event);
                } else if (typeof insertText === 'function') {
                    insertText(data.text);
                } else if (typeof setText === 'function') {
                    setText(data.text);
                } else {
                    console.warn("Nenhum método encontrado para inserir texto. Copiando para clipbord.");
                    navigator.clipboard.writeText(data.text);
                    toast.success('Transcrito e copiado para a área de transferência!', { id: loadingToast });
                    return;
                }
            }
            toast.success('Áudio transcrito!', { id: loadingToast });
        } catch (error) {
            console.error('Transcription error:', error);
            toast.error('Erro ao escrever. Tenta novamente.', { id: loadingToast });
        } finally {
            setIsTranscribing(false);
        }
    };

    return (
        <div className="flex items-center ml-2 border-l pl-2 border-gray-100">
            {isTranscribing ? (
                <Loader2 className="animate-spin text-green-600" size={20} />
            ) : isRecording ? (
                <button
                    onClick={stopRecording}
                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition animate-pulse"
                    title="Parar gravação"
                >
                    <Square size={18} fill="currentColor" />
                </button>
            ) : (
                <button
                    onClick={startRecording}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition"
                    title="Gravar áudio para texto"
                >
                    <Mic size={20} />
                </button>
            )}
        </div>
    );
};

export const CustomMessageInput = () => {
    const { channel } = useChannelStateContext()
    const { user } = useAuth()

    useEffect(() => {
        const handleNewMessage = async (event) => {
            if (event.user?.id !== user?.uid) return;

            try {
                const members = Object.values(channel.state.members || {})
                const recipientIds = members
                    .map(m => m.user?.id)
                    .filter(id => id && id !== event.user?.id)

                if (recipientIds.length > 0) {
                    const senderName = event.user?.name || user?.displayName || 'Alguém';
                    await NotificationService.notifyMessage(recipientIds, event.message?.text || '(mídia)', senderName)
                }
            } catch (error) {
                console.error('❌ [CustomMessageInput] Notification failed:', error)
            }
        }

        channel.on('message.new', handleNewMessage)
        return () => channel.off('message.new', handleNewMessage)
    }, [channel, user])

    return (
        <div className="flex items-center w-full">
            <div className="flex-1">
                <StreamMessageInput />
            </div>
            <AudioRecorder />
        </div>
    )
}
