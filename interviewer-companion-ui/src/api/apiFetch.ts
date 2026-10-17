export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

// fetch wrapper that sends the session cookie and signals the app when the session has expired
export const apiFetch = async (input: string, init: RequestInit = {}) => {
  const response = await fetch(input, { ...init, credentials: 'include' })
  if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  return response
}
