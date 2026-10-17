import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthUser } from '../types'
import { fetchCurrentUser, signInWithGoogle, signOut as signOutRequest } from '../api/authApi'
import { UNAUTHORIZED_EVENT } from '../api/apiFetch'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  signIn: (credential: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Any API call that comes back 401 means the session is gone: return to the landing page
  useEffect(() => {
    const handleUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const signIn = useCallback(async (credential: string) => {
    setUser(await signInWithGoogle(credential))
  }, [])

  const signOut = useCallback(async () => {
    await signOutRequest().catch(() => {})
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}
