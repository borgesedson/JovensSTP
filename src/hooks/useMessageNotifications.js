import { useEffect } from 'react';
import { useStreamChat } from './useStreamChat';
import { useAuth } from '../hooks/useAuth';
import { notificationSounds } from '../services/notificationSounds';

/**
 * Hook que monitora novas mensagens e envia notificações push
 * para os outros membros do canal
 */
export const useMessageNotifications = () => {
  const { chatClient: client } = useStreamChat();
  const { user } = useAuth();

  useEffect(() => {
    if (!client || !user) return;

    // Listener para novas mensagens
    const handleNewMessage = async (event) => {
      console.log('📩 Nova mensagem recebida:', event)

      // Ignorar se a mensagem foi enviada por mim
      if (event.user?.id === user.uid) {
        console.log('⏭️ Mensagem própria, ignorando')
        return;
      }

      console.log('🔔 Mensagem de outro usuário, tocando som')
      // (Som de mensagem removido)

      // Ignorar mensagens do sistema
      if (event.message?.type === 'system') return;

      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await import('../services/firebase');

        const functions = getFunctions(app);
        const sendMessageNotification = httpsCallable(functions, 'v4_sendNotification');

        // Enviar notificação para todos os membros exceto o remetente
        const channel = event.channel;
        const memberIds = Object.keys(channel?.state?.members || {})
          .filter(memberId => memberId !== event.user?.id);

        for (const memberId of memberIds) {
          try {
            await sendMessageNotification({
              recipientId: memberId,
              senderName: event.user?.name || 'Alguém',
              senderPhoto: event.user?.image,
              messageText: event.message?.text || 'Enviou uma mensagem',
              channelId: channel?.id
            });
          } catch (error) {
            console.warn('Erro ao enviar notificação de mensagem:', error);
          }
        }
      } catch (error) {
        console.error('Erro ao processar notificação de mensagem:', error);
      }
    };

    // Registrar listener
    client.on('message.new', handleNewMessage);

    // Cleanup
    return () => {
      client.off('message.new', handleNewMessage);
    };
  }, [client, user]);
};
