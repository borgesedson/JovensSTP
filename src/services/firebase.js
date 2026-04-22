import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'
import { getFunctions } from 'firebase/functions'
import { getDataConnect } from 'firebase/data-connect'



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

export const dataconnect = getDataConnect(app, {
  connector: 'example',
  service: 'jovensstp-pwa',
  location: 'europe-west9'
});



// Sync connections (safe for Vite)
if (import.meta.env.DEV) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // console.log('🔧 Firebase Emulators enabled (Modify firebase.js to uncomment specific emulators)');
    // Implementation note: If you need emulators, use dynamic imports but dont await them at top level
    // import('firebase/functions').then(({ connectFunctionsEmulator }) => connectFunctionsEmulator(functions, 'localhost', 5001));
  }
}

// Export a helper to get the messaging instance when supported
export const getMessagingInstance = async () => {
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}
