import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'
import { getFunctions } from 'firebase/functions'

// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export { app }
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app, 'us-central1')

// Connect to emulators if in development and emulators are running
if (import.meta.env.DEV) {
  const { connectFunctionsEmulator } = await import('firebase/functions');
  const { connectAuthEmulator } = await import('firebase/auth');
  const { connectFirestoreEmulator } = await import('firebase/firestore');

  // Check if emulators are already connected or should be
  try {
    // Only connect if not already connected
    // Localhost detection is usually enough
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🔧 Connecting to Firebase Emulators...');
      // connectAuthEmulator(auth, 'http://localhost:9099');
      // connectFirestoreEmulator(db, 'localhost', 8080);
      // connectFunctionsEmulator(functions, 'localhost', 5001);
    }
  } catch (e) {
    console.warn('Emulator connection error (likely already connected):', e);
  }
}

// Export a helper to get the messaging instance when supported
export const getMessagingInstance = async () => {
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}
