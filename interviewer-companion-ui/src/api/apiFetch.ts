
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

const sha256Hex = async (bytes: BufferSource): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Sends the session cookie and signs body-bearing requests for CloudFront OAC.
// OAC needs the payload hash, so non-string bodies (e.g. FormData) are serialized
// to bytes up front, keeping the generated multipart Content-Type/boundary.
export const apiFetch = async (
  input: string,
  init: RequestInit = {},
) => {
  const headers = new Headers(init.headers)
  const method = (init.method || 'GET').toUpperCase()
  let body = init.body

  if (body != null && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const serialized = new Response(body)
    const contentType = serialized.headers.get('content-type')
    const bytes = await serialized.arrayBuffer()

    if (contentType && !headers.has('content-type')) {
      headers.set('content-type', contentType)
    }
    headers.set('x-amz-content-sha256', await sha256Hex(bytes))
    body = bytes
  }

  const response = await fetch(input, {
    ...init,
    body,
    headers,
    credentials: 'include',
  })

  if (response.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }

  return response
}
