import { httpsCallable } from 'firebase/functions'
import { functions, db, auth } from './firebase'
import { collection, doc, writeBatch } from 'firebase/firestore'

class NotificationService {
    static async sendEmail({ recipientIds, type, messageText, senderName }) {
        const user = auth.currentUser;
        console.log('🔍 [NotificationService] Current user:', user ? user.uid : 'NOT LOGGED IN');

        if (!user) {
            console.error('❌ [NotificationService] No user logged in!');
            return;
        }

        try {
            console.log('📡 [NotificationService] Calling Cloud Function...', {
                recipientIds,
                type,
                messageText: messageText?.substring(0, 50),
                functionName: 'v4_sendNotificationEmail'
            });

            const sendEmail = httpsCallable(functions, 'v4_sendNotificationEmail');
            console.log('🔧 [NotificationService] httpsCallable created, invoking NOW...');

            const result = await sendEmail({
                recipientIds,
                type,
                messageText,
                senderName: senderName || user.displayName || 'JovensSTP'
            });

            console.log('📦 [NotificationService] RAW RESULT:', result);
            console.log('📦 [NotificationService] Result.data:', result.data);
            console.log(`✅ [NotificationService] Email triggered: ${type}`, result.data);
            return result.data;
        } catch (error) {
            console.error(`❌ [NotificationService] Failed to trigger email (${type}):`, {
                code: error.code,
                message: error.message,
                details: error.details,
                stack: error.stack,
                fullError: error
            });
            throw error;
        }
    }

    static async notifyMessage(recipientIds, text, senderName = 'Alguém') {
        const user = auth.currentUser;
        if (!user) return;

        // Write to Firestore 'notifications' to trigger the Universal Push (v4_onNotificationCreated)
        // Eliminámos o envio do Email conforme pedido!
        try {
            const batch = writeBatch(db);
            recipientIds.forEach(id => {
                if (id !== user.uid) {
                    const notifRef = doc(collection(db, 'notifications', id, 'items'));
                    batch.set(notifRef, {
                        type: 'chat_message',
                        senderName: senderName || user.displayName || 'Nova Mensagem', // Storing for the backend Push
                        message: text.substring(0, 150), // Removidas as aspas literais "" e ampliado
                        link: '/chat',
                        read: false,
                        timestamp: new Date()
                    });
                }
            });
            await batch.commit();
            console.log('✅ [NotificationService] Push Triggered for chat (via Firestore)!');
        } catch (dbError) {
            console.error('❌ [NotificationService] Failed to write in-app DB trigger:', dbError);
        }
    }

    static async notifyStoryCreated(recipientIds, content) {
        return this.sendEmail({
            recipientIds,
            type: 'story',
            messageText: content
        });
    }
}

export default NotificationService;
