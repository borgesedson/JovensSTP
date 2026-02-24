import { MessageInput as StreamMessageInput } from 'stream-chat-react'
import { useChannelStateContext } from 'stream-chat-react'
import { useAuth } from '../hooks/useAuth'
import NotificationService from '../services/NotificationService'
import { useEffect } from 'react'
import { Guardian } from '../utils/securityUtils'
import toast from 'react-hot-toast'

export const CustomMessageInput = () => {
    const { channel } = useChannelStateContext()
    const { user } = useAuth()

    // Listen to new messages sent by this user
    useEffect(() => {
        const handleNewMessage = async (event) => {
            console.log('🚀 [CustomMessageInput] New message detected:', event.user?.id);

            try {
                const members = Object.values(channel.state.members || {})
                const recipientIds = members
                    .map(m => m.user?.id)
                    .filter(id => id && id !== event.user?.id) // Exclude the sender

                console.log(`📧 [CustomMessageInput] Recipients:`, recipientIds);

                if (recipientIds.length > 0) {
                    console.log(`📧 [CustomMessageInput] Notifying ${recipientIds.length} users...`);
                    await NotificationService.notifyMessage(recipientIds, event.message?.text || '(mídia)')
                } else {
                    console.log('ℹ️ [CustomMessageInput] No recipients to notify.');
                }
            } catch (error) {
                console.error('❌ [CustomMessageInput] Notification failed:', error)
            }
        }

        channel.on('message.new', handleNewMessage)
        return () => channel.off('message.new', handleNewMessage)
    }, [channel, user])

    // Intercept submission to validate content
    const overrideSubmitHandler = (message, channel) => {
        const check = Guardian.validateText(message.text);
        if (!check.clean) {
            toast.error('⚠️ Mensagem bloqueada: Conteúdo impróprio detetado. Vamos manter o chat seguro para todos!');
            console.warn('[Guardian] Chat message blocked:', { text: message.text, found: check.found });
            return;
        }
        // If clean, use the default channel sendMessage
        return channel.sendMessage(message);
    };

    // Return default MessageInput with our security filter
    return <StreamMessageInput overrideSubmitHandler={overrideSubmitHandler} />
}
