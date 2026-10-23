
const LOCAL_API_URL = 'http://localhost:3001/api'

// Local dev falls back to the local server; production requires VITE_API_URL.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  throw new Error('VITE_API_URL must be set when building for production')
}

export const API_URL: string = (
  import.meta.env.VITE_API_URL || LOCAL_API_URL
).replace(/\/+$/, '')

// Uploaded images can be server-relative paths or absolute URLs.
export const toImageUrl = (url: string) =>
  /^https?:\/\//.test(url)
    ? url
    : `${API_URL.replace(/\/api$/, '')}${url}`

export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

const sha256Hex = async (body: string): Promise<string> => {
  const bytes = new TextEncoder().encode(body)
  const hash = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Sends the session cookie and signs body-bearing requests for CloudFront OAC.
export const apiFetch = async (
  input: string,
  init: RequestInit = {},
) => {
  const headers = new Headers(init.headers)
  const method = (init.method || 'GET').toUpperCase()
  const body = init.body

  if (
    typeof body === 'string' &&
    ['POST', 'PUT', 'PATCH'].includes(method)
  ) {
    headers.set('x-amz-content-sha256', await sha256Hex(body))
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  return response
}
