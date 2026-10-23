import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types'
import {
  fetchCurrentUser,
  signInWithGoogle,
  signOut as signOutRequest,
} from '../api/authApi'

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
    let cancelled = false

    fetchCurrentUser()
      .then(currentUser => {
        if (!cancelled) setUser(currentUser)
      })
      .catch(error => {
        console.error('Failed to restore authentication session:', error)
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (credential: string) => {
    const authenticatedUser = await signInWithGoogle(credential)
    setUser(authenticatedUser)
  }, [])

  const signOut = useCallback(async () => {
    await signOutRequest()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
