import type { AuthUser } from '../types'
import { API_URL, apiFetch } from './apiFetch'

export const fetchCurrentUser = async (): Promise<AuthUser | null> => {
  const response = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Failed to check session')
  return (await response.json()).user
}

export const signInWithGoogle = async (credential: string): Promise<AuthUser> => {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? 'Sign-in failed')
  }
  return (await response.json()).user
}

export const signOut = () => apiFetch(`${API_URL}/auth/logout`, { method: 'POST' })
