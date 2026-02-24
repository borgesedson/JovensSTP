import { getMessagingInstance } from './firebase'
import { getToken } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// Registers service worker, gets FCM token and saves it to user doc.
export const registerForPush = async (uid, forcePrompt = false) => {
  if (!uid) return null

  if (!('Notification' in window)) return null

  try {
    // If forcePrompt is true, request permission if not already granted
    if (forcePrompt && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return null
    }

    if (Notification.permission !== 'granted') return null

    // Use the PWA service worker registration
    let registration
    try {
      registration = await navigator.serviceWorker.ready
    } catch (e) {
      console.warn('Service worker not ready', e)
      return null
    }

    const messaging = await getMessagingInstance()
    if (!messaging) return null

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined

    const fcmToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    if (fcmToken) {
      // Save token into user's document (arrayUnion to allow multiple devices)
      const userRef = doc(db, 'users', uid)
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(fcmToken),
      })
      console.log('✅ FCM Token registrado no Firestore:', fcmToken.substring(0, 10) + '...')
      return fcmToken
    }
  } catch (err) {
    // Not blocking: log and continue
    console.error('registerForPush error', err)
    return null
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
