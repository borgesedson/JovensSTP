import { getMessagingInstance } from './firebase'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// Registers the Firebase Messaging SW, gets FCM token and saves it to user doc.
export const registerForPush = async (uid, forcePrompt = false) => {
  if (!uid) return null
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null

  try {
    // Step 1: Request permission
    if (Notification.permission === 'default' && forcePrompt) {
      const permission = await Notification.requestPermission()
      console.log('🔔 Notification permission:', permission)
      if (permission !== 'granted') return null
    }

    if (Notification.permission !== 'granted') {
      console.log('🔕 Notifications not granted:', Notification.permission)
      return null
    }

    // Step 2: Register the FIREBASE messaging SW explicitly (not the PWA one)
    let registration
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      })
      console.log('✅ Firebase Messaging SW registered:', registration.scope)
    } catch (e) {
      console.warn('Firebase Messaging SW registration failed:', e)
      // Fallback: try using whatever SW is ready
      registration = await navigator.serviceWorker.ready
    }

    // Step 3: Get FCM token
    const messaging = await getMessagingInstance()
    if (!messaging) {
      console.warn('Messaging not supported')
      return null
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined

    const fcmToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    if (fcmToken) {
      // Step 3.1: Save token into dedicated fcm_tokens collection
      const tokenRef = doc(db, 'fcm_tokens', uid)
      await setDoc(tokenRef, {
        tokens: arrayUnion(fcmToken),
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      // Step 3.2: Legacy backup (don't break existing background triggers yet)
      const userRef = doc(db, 'users', uid)
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(fcmToken),
      }).catch(() => {}) 

      console.log('✅ FCM Token saved to fcm_tokens/', uid)

      // Step 4: Listen for foreground messages (integrated listener)
      onMessage(messaging, (payload) => {
        console.log('📩 Foreground message:', payload)
        const { senderName, senderPhoto, channelId } = payload.data || {}
        const title = payload.notification?.title || senderName || 'JovensSTP'
        const body = payload.notification?.body || 'Nova mensagem'
        
        // Browser notification with photo
        if (Notification.permission === 'granted') {
          const notif = new Notification(title, {
            body,
            icon: senderPhoto || '/icon-192.png',
            badge: '/icon-72.png',
            tag: channelId || 'message',
            renotify: true,
          })

          notif.onclick = () => {
            window.focus()
            // We'll need access to navigate here, but for simplicity we use window.location
            if (channelId) window.location.href = `/chat?channel=${channelId}`
            notif.close()
          }
        }
      })

      return fcmToken
    }
  } catch (err) {
    console.error('registerForPush error:', err)
    return null
  }
}

/**
 * setupForegroundNotifications
 * Specifically for use in App.jsx to handle deep linking with navigate
 */
export const setupForegroundNotifications = (messaging, navigate) => {
  if (!messaging) return;
  
  return onMessage(messaging, (payload) => {
    console.log('📩 Foreground message (custom):', payload);
    const { senderName, senderPhoto, channelId } = payload.data || {};
    const title = payload.notification?.title || senderName || 'JovensSTP';
    const body = payload.notification?.body || 'Nova mensagem';

    if (Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon: senderPhoto || '/icon-192.png',
        badge: '/icon-72.png',
        tag: channelId || 'message',
        renotify: true,
      });

      notif.onclick = () => {
        window.focus();
        if (navigate) {
          navigate(channelId ? `/chat?channel=${channelId}` : '/chat');
        } else {
          window.location.href = channelId ? `/chat?channel=${channelId}` : '/chat';
        }
        notif.close();
      };
    }
  });
};

// Trigger a manual test ping notification for the current user
export const testPushPing = async () => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { app } = await import('./firebase');
    const functions = getFunctions(app, 'us-central1');
    const ping = httpsCallable(functions, 'v4_testPushPing');
    const result = await ping();
    console.log('🏓 Ping result:', result.data);
    return result.data;
  } catch (e) {
    console.error('testPushPing failed:', e);
    throw e;
  }
}

// Sends push notification via Firebase Cloud Function (if FCM is active)
export const sendPushNotification = async (userId, title, body) => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions')
    const { app } = await import('./firebase')
    const functions = getFunctions(app)
    const sendPush = httpsCallable(functions, 'v4_sendNotification')
    await sendPush({ userId, title, body })
  } catch (e) {
    console.debug('sendPushNotification error (non-blocking)', e)
  }
}

// Aggregates follower notifications for companies by day to reduce noise.
// Creates/updates a single notification per company per day with a running count and a sample of recent followers.
// Shape example:
// {
//   userId: <companyId>,
//   type: 'followers_aggregate',
//   dateKey: '2025-11-12',
//   title: 'Novos seguidores',
//   message: 'Maria e mais 3 pessoas seguiram tua empresa hoje',
//   count: 4,
//   latest: [{ uid, name, photo }], // up to 3
//   timestamp: serverTimestamp()
// }
export const aggregateFollowerNotification = async (companyId, follower) => {
  try {
    if (!companyId || !follower?.uid) return

    const dateKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const notifId = `followers_${companyId}_${dateKey}`
    const notifRef = doc(db, 'notifications', notifId)
    const snap = await getDoc(notifRef)

    const followerSummary = {
      uid: follower.uid,
      name: follower.name || 'Usuário',
      photo: follower.photo || null,
    }

    if (!snap.exists()) {
      const title = 'Novos seguidores'
      const message = `${followerSummary.name} seguiu tua empresa hoje`
      await setDoc(notifRef, {
        userId: companyId,
        type: 'followers_aggregate',
        dateKey,
        title,
        message,
        count: 1,
        latest: [followerSummary],
        timestamp: serverTimestamp(),
        actionUrl: `/profile/${companyId}`,
      })
      return
    }

    const data = snap.data() || {}
    const count = (data.count || 0) + 1
    // Build latest with new follower at front and keep unique by uid, up to 3
    const existing = Array.isArray(data.latest) ? data.latest : []
    const dedup = [followerSummary, ...existing.filter((x) => x.uid !== followerSummary.uid)].slice(0, 3)

    // Compose a concise message: '<name> e mais N seguiram tua empresa hoje'
    let message
    if (count <= 1) {
      message = `${followerSummary.name} seguiu tua empresa hoje`
    } else if (count === 2) {
      message = `${followerSummary.name} e mais 1 pessoa seguiram tua empresa hoje`
    } else {
      message = `${followerSummary.name} e mais ${count - 1} pessoas seguiram tua empresa hoje`
    }

    await setDoc(notifRef, {
      userId: companyId,
      type: 'followers_aggregate',
      dateKey,
      title: 'Novos seguidores',
      message,
      count,
      latest: dedup,
      timestamp: serverTimestamp(),
      actionUrl: `/profile/${companyId}`,
    }, { merge: true })
  } catch (e) {
    console.warn('aggregateFollowerNotification failed', e)
  }
}
