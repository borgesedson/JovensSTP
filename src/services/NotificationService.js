import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import { auth } from './firebase'

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

    static async notifyMessage(recipientIds, text) {
        return this.sendEmail({
            recipientIds,
            type: 'message',
            messageText: text
        });
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
