import { useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { registerForPush } from '../services/notifications'
import { AuthContext } from './authContextValue'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Get user profile from Firestore
        const userRef = doc(db, 'users', authUser.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          setUser({
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            emailVerified: authUser.emailVerified,
            ...userSnap.data(),
          })
          setUserType(userSnap.data().type)
          // Attempt to register for push notifications only if already granted (avoid auto-prompt)
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              registerForPush(authUser.uid).catch((e) => console.warn('FCM register failed', e))
            }
          } catch (e) {
            console.debug('Notification permission check failed', e)
          }
          // Subscribe to live profile updates
          const unsubProfile = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              setUser({
                uid: authUser.uid,
                email: authUser.email,
                displayName: authUser.displayName,
                emailVerified: authUser.emailVerified,
                ...(snap.data()),
              })
              setUserType(snap.data().type)
            }
          })

          // Update lastActive (Throttle to once per hour to save writes)
          try {
            const lastActive = userSnap.data().lastActive
            const now = new Date()
            const shouldUpdate = !lastActive || (now.getTime() - lastActive.toDate().getTime() > 3600000) // 1 hour

            if (shouldUpdate) {
              updateDoc(userRef, { lastActive: now })
            }
          } catch (e) {
            console.warn("Failed to update lastActive", e)
          }

          // Store unsub on the authUser object to cleanup on signout
          // We'll return unsub in the outer unsubscribe
          authUser.__profileUnsub = unsubProfile
        } else {
          setUser({
            uid: authUser.uid,
            email: authUser.email,
          })
        }
      } else {
        // Clean profile subscription if exists
        if (auth?.currentUser?.__profileUnsub) {
          try { auth.currentUser.__profileUnsub() } catch { /* ignore */ }
          auth.currentUser.__profileUnsub = null
        }
        setUser(null)
        setUserType(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signup = async (email, password, profileData, type) => {
    try {
      setError(null)
      const { user: authUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )

      // Create user profile in Firestore with extended data
      const userRef = doc(db, 'users', authUser.uid)
      const userDoc = {
        email,
        // For company accounts, displayName should be the company name
        displayName: type === 'company' ? (profileData.company || profileData.displayName || '') : (profileData.displayName || ''),
        type, // 'young' or 'company'
        photoURL: null,
        bio: profileData.bio || '',
        location: profileData.location || '',
        createdAt: new Date(),
      }

      // Add type-specific fields
      if (type === 'young') {
        userDoc.education = profileData.education || ''
        userDoc.skills = profileData.skills || ''
      } else {
        const companyName = profileData.company || profileData.displayName || ''
        userDoc.company = companyName
        userDoc.sector = profileData.sector || ''
        userDoc.companySize = profileData.companySize || ''
        userDoc.website = profileData.website || ''
        // Redes sociais
        userDoc.linkedin = profileData.linkedin || ''
        userDoc.instagram = profileData.instagram || ''
        userDoc.facebook = profileData.facebook || ''
        // Optionally store the contact person's name for internal use
        if (profileData.displayName) userDoc.contactName = profileData.displayName
      }

      await setDoc(userRef, userDoc)

      // Enviar email de verificação
      try {
        await sendEmailVerification(authUser)
      } catch (verifyErr) {
        console.warn('Erro ao enviar email de verificação:', verifyErr)
      }

      setUser({
        uid: authUser.uid,
        email,
        emailVerified: authUser.emailVerified,
        ...userDoc,
      })
      setUserType(type)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const login = async (email, password) => {
    try {
      setError(null)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const logout = async () => {
    try {
      setError(null)
      await signOut(auth)
      setUser(null)
      setUserType(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const resetPassword = async (email) => {
    try {
      setError(null)
      // Por enquanto, usa o email padrão Firebase (sem actionCodeSettings)
      // Para usar a página branded custom, adiciona o teu domínio em:
      // Firebase Console → Authentication → Settings → Authorized domains
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const value = {
    user,
    userType,
    loading,
    error,
    signup,
    login,
    logout,
    resetPassword,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
