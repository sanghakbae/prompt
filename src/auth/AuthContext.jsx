import { createContext, useContext, useEffect, useState } from 'react'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured, ALLOWED_EMAILS } from '../firebase'

const AuthContext = createContext(null)

// Popup sign-in breaks in browsers that apply a strict Cross-Origin-Opener-Policy
// (and in in-app webviews): Firebase can no longer poll the popup, so the flow
// dies reporting the popup as closed. Fall back to a full-page redirect there.
const REDIRECT_FALLBACK = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
])

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    // Surfaces the outcome of a redirect sign-in started before the reload.
    getRedirectResult(auth).catch((e) => setError(e.message))

    return onAuthStateChanged(auth, (u) => {
      if (u && ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes((u.email || '').toLowerCase())) {
        fbSignOut(auth)
        setError(`허용되지 않은 계정입니다: ${u.email}`)
        setUser(null)
      } else {
        setUser(u)
        // Only a successful sign-in clears the message. The sign-out above also
        // fires this callback with u === null, which used to erase the
        // "허용되지 않은 계정" error before it could be read.
        if (u) setError(null)
      }
      setLoading(false)
    })
  }, [])

  const signIn = async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      if (REDIRECT_FALLBACK.has(e.code)) {
        try {
          await signInWithRedirect(auth, googleProvider)
          return
        } catch (e2) {
          return setError(e2.message)
        }
      }
      if (e.code === 'auth/cancelled-popup-request') return // a second click superseded the first
      setError(e.message)
    }
  }

  const signOut = () => fbSignOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut, configured: isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
