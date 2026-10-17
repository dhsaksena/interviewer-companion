import { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window { google?: GoogleIdentity }
}

let scriptPromise: Promise<void> | null = null

const loadGoogleScript = () => {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load Google Sign-In'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface Props {
  onCredential: (credential: string) => void
}

const GoogleSignInButton = ({ onCredential }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  const [error, setError] = useState<string | null>(
    CLIENT_ID ? null : 'Google sign-in is not configured (missing VITE_GOOGLE_CLIENT_ID).'
  )

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: response => callbackRef.current(response.credential),
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 280,
        })
      })
      .catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [])

  if (error) return <p className="signin-error" role="alert">{error}</p>
  return <div ref={containerRef} className="google-button-slot" />
}

export default GoogleSignInButton
