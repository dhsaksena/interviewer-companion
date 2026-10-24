import { useEffect, useSyncExternalStore } from 'react'

// Tiny hash router: works on static hosting (S3) without rewrite rules, keeps the browser's
// back/forward/refresh/bookmark behaviour, and can block navigation while a form has unsaved changes.

export type Route =
  | { name: 'home' }
  | { name: 'questions'; sub: string | null }
  | { name: 'question-new'; sub: string | null }
  | { name: 'question-view'; id: number; from: string | null }
  | { name: 'question-edit'; id: number; from: string | null }
  | { name: 'interviews' }
  | { name: 'interview-new' }
  | { name: 'interview-view'; id: number }
  | { name: 'interview-edit'; id: number }

const withQuery = (path: string, params: Record<string, string | null | undefined>) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value)
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

export const paths = {
  home: () => '/',
  questions: (sub?: string | null) => withQuery('/questions', { sub }),
  questionNew: (sub?: string | null) => withQuery('/questions/new', { sub }),
  questionView: (id: number, from?: string | null) => withQuery(`/questions/${id}`, { from }),
  questionEdit: (id: number, from?: string | null) => withQuery(`/questions/${id}/edit`, { from }),
  interviews: () => '/interviews',
  interviewNew: () => '/interviews/new',
  interviewView: (id: number) => `/interviews/${id}`,
  interviewEdit: (id: number) => `/interviews/${id}/edit`,
}

export const parseRoute = (path: string): Route => {
  const [pathname, queryText = ''] = path.split('?')
  const query = new URLSearchParams(queryText)
  const parts = pathname.split('/').filter(Boolean)
  const id = Number(parts[1])
  const validId = Number.isInteger(id) && id > 0

  if (parts[0] === 'questions') {
    if (parts.length === 1) return { name: 'questions', sub: query.get('sub') }
    if (parts[1] === 'new') return { name: 'question-new', sub: query.get('sub') }
    if (validId && parts.length === 2) return { name: 'question-view', id, from: query.get('from') }
    if (validId && parts[2] === 'edit') return { name: 'question-edit', id, from: query.get('from') }
  }
  if (parts[0] === 'interviews') {
    if (parts.length === 1) return { name: 'interviews' }
    if (parts[1] === 'new') return { name: 'interview-new' }
    if (validId && parts.length === 2) return { name: 'interview-view', id }
    if (validId && parts[2] === 'edit') return { name: 'interview-edit', id }
  }
  return { name: 'home' }
}

const readHash = () => window.location.hash.replace(/^#/, '') || '/'

let current = readHash()
let dirty = false
let pending: string | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(listener => listener())

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

window.addEventListener('hashchange', () => {
  const next = readHash()
  if (next === current) return
  if (dirty) {
    // Browser back/forward while a form is dirty: restore the URL and ask first
    pending = next
    window.history.replaceState(null, '', `#${current}`)
  } else {
    current = next
    pending = null
  }
  emit()
})

export interface NavigateOptions {
  // Skip the unsaved-changes prompt
  force?: boolean
  // Replace the current history entry instead of adding one
  replace?: boolean
}

export const navigate = (path: string, { force = false, replace = false }: NavigateOptions = {}) => {
  if (path === current) return
  if (dirty && !force) {
    pending = path
    emit()
    return
  }
  current = path
  pending = null
  if (replace) window.history.replaceState(null, '', `#${path}`)
  else window.location.hash = path
  emit()
}

export const useRoute = (): Route => parseRoute(useSyncExternalStore(subscribe, () => current))

export const usePendingNavigation = () => {
  const hasPending = useSyncExternalStore(subscribe, () => pending !== null)
  return {
    hasPending,
    stay: () => { pending = null; emit() },
    leave: () => {
      const target = pending
      pending = null
      dirty = false
      if (target) navigate(target, { force: true })
    },
  }
}

// While `unsaved` is true, in-app navigation asks for confirmation and closing the tab warns
export const useUnsavedGuard = (unsaved: boolean) => {
  useEffect(() => {
    dirty = unsaved
    if (!unsaved) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      dirty = false
    }
  }, [unsaved])
}

// Where a page opened with ?from=<path> should return to
export const backTarget = (from: string | null, fallback: string) =>
  from && from.startsWith('/') ? from : fallback

export const fromLabel = (from: string | null, fallback: string) => {
  if (!from) return fallback
  const route = parseRoute(from)
  if (route.name === 'interview-view') return 'Interview'
  if (route.name === 'questions') return route.sub ?? 'All questions'
  return fallback
}
