import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import '../styles/Candidates.css'
import { MdEmail, MdPhone, MdPlace, MdLink, MdInfoOutline, MdHub, MdTableRows } from 'react-icons/md'
import type { Candidate, ProgressEvent } from '../types'
import PageHeader from '../components/PageHeader'
import { ConfirmDialog } from '../components/CategoryDialogs'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import CandidateDetails from '../components/candidate/CandidateDetails'
import CandidateGraph, { type NodeRunStatus } from '../components/candidate/CandidateGraph'
import DeepDivePanel, { type DeepDiveRun } from '../components/candidate/DeepDivePanel'
import { deleteCandidate, fetchCandidate, runDeepDive } from '../api/candidatesApi'
import { formatRelative } from '../utils/formatRelative'
import { initialsOf, toHref } from '../utils/candidateStats'
import { buildCandidateGraph, deepDiveTypeLabel } from '../utils/candidateGraph'
import { navigate, paths, type CandidateView } from '../router'

interface CandidateViewPageProps {
  candidateId: number
  view: CandidateView
}

const TABS: { key: CandidateView; label: string; icon: typeof MdHub }[] = [
  { key: 'graph', label: 'Graph', icon: MdHub },
  { key: 'details', label: 'Details', icon: MdTableRows },
]

// Shown until the workflow's first event arrives (same steps the server reports)
const STARTING: ProgressEvent = {
  percent: 0,
  message: 'Starting the workflow',
  steps: [
    { key: 'plan', label: 'Plan the deep dive', status: 'active' },
    { key: 'research', label: 'Research', status: 'pending' },
    { key: 'validate', label: 'Validate findings', status: 'pending' },
  ],
}

const CandidateViewPage = ({ candidateId, view }: CandidateViewPageProps) => {
  const toast = useToast()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Deep dives by graph node id; kept while switching tabs, cancelled when leaving the page
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [runs, setRuns] = useState<Record<string, DeepDiveRun>>({})
  const controllers = useRef(new Map<string, AbortController>())

  useEffect(() => {
    let cancelled = false
    fetchCandidate(candidateId)
      .then(data => { if (!cancelled) setCandidate(data) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load candidate') })
    return () => { cancelled = true }
  }, [candidateId, reloadKey])

  useEffect(() => {
    const running = controllers.current
    return () => running.forEach(controller => controller.abort())
  }, [])

  const updateRun = (id: string, patch: Partial<DeepDiveRun>) =>
    setRuns(prev => ({ ...prev, [id]: { ...prev[id], ...patch } as DeepDiveRun }))

  const startDeepDive = useCallback(async (targetId: string) => {
    controllers.current.get(targetId)?.abort()
    const controller = new AbortController()
    controllers.current.set(targetId, controller)
    setRuns(prev => ({ ...prev, [targetId]: { status: 'running', progress: STARTING } }))

    try {
      const result = await runDeepDive(candidateId, targetId, progress => updateRun(targetId, { progress }), controller.signal)
      updateRun(targetId, { status: 'done', result })
    } catch (err) {
      if (controller.signal.aborted) {
        // Cancelled by the user (or replaced by a re-run): forget it unless a new run took over
        if (controllers.current.get(targetId) === controller) {
          setRuns(prev => { const next = { ...prev }; delete next[targetId]; return next })
        }
        return
      }
      setRuns(prev => ({
        ...prev,
        [targetId]: {
          ...prev[targetId],
          status: 'failed',
          error: err instanceof Error ? err.message : 'Deep dive failed',
          progress: { ...prev[targetId].progress, steps: prev[targetId].progress.steps.map(s => (s.status === 'active' ? { ...s, status: 'failed' } : s)) },
        },
      }))
    } finally {
      if (controllers.current.get(targetId) === controller) controllers.current.delete(targetId)
    }
  }, [candidateId])

  // Clicking a node runs its deep dive; a node that already has a result just shows it
  const selectNode = (targetId: string) => {
    setSelectedId(targetId)
    const existing = runs[targetId]
    if (!existing || existing.status === 'failed') startDeepDive(targetId)
  }

  const statuses = useMemo(
    () => Object.fromEntries(Object.entries(runs).map(([id, run]) => [id, run.status])) as Record<string, NodeRunStatus>,
    [runs]
  )

  const selectedLabel = useMemo(() => {
    if (!candidate || !selectedId) return null
    if (selectedId === 'candidate') return candidate.profile.fullName
    return buildCandidateGraph(candidate.profile).leaves.find(l => l.id === selectedId)?.tooltip ?? selectedId
  }, [candidate, selectedId])

  const setView = (next: CandidateView) => navigate(paths.candidateView(candidateId, next), { replace: true })

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next = TABS[(TABS.findIndex(t => t.key === view) + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    setView(next.key)
    document.getElementById(`cd-tab-${next.key}`)?.focus()
  }

  const handleDelete = async () => {
    await deleteCandidate(candidateId)
    toast('Candidate deleted')
    navigate(paths.candidates())
  }

  const profile = candidate?.profile

  return (
    <div className="page">
      <PageHeader
        title={profile?.fullName ?? 'Candidate'}
        crumbs={[{ label: 'Candidates', onClick: () => navigate(paths.candidates()) }, { label: profile?.fullName ?? '…' }]}
        onBack={() => navigate(paths.candidates())}
        actions={candidate && <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>Delete</button>}
      />

      <div className="page-body">
        {error && <ErrorBox message={error} onRetry={() => { setError(null); setReloadKey(k => k + 1) }} />}
        {!candidate && !error && <LoadingState label="Loading candidate" rows={4} />}

        {candidate && profile && (
          <div className={`cd-view ${view === 'graph' ? 'wide' : ''}`}>
            <section className="cd-panel cd-hero">
              <span className="cd-avatar large" aria-hidden="true">{initialsOf(profile.fullName)}</span>
              <div className="cd-hero-main">
                <h2>{profile.fullName}</h2>
                {profile.headline && <p className="cd-headline">{profile.headline}</p>}
                <ul className="cd-contact">
                  {profile.location && <li><MdPlace aria-hidden="true" />{profile.location}</li>}
                  {profile.email && <li><MdEmail aria-hidden="true" /><a href={`mailto:${profile.email}`}>{profile.email}</a></li>}
                  {profile.phone && <li><MdPhone aria-hidden="true" /><a href={`tel:${profile.phone}`}>{profile.phone}</a></li>}
                  {profile.profileLinks.map(link => (
                    <li key={link.url}><MdLink aria-hidden="true" /><a href={toHref(link.url)} target="_blank" rel="noopener noreferrer">{link.platform || link.url}</a></li>
                  ))}
                </ul>
              </div>
              <span className="cd-muted cd-source" title={candidate.resumeFileName}>
                From {candidate.resumeFileName || 'resume'} · {formatRelative(candidate.createdAt)}
              </span>
            </section>

            {candidate.warnings.length > 0 && (
              <div className="alert alert-info cd-warnings" role="note">
                <MdInfoOutline aria-hidden="true" />
                <div>
                  <strong>Check these details against the resume</strong>
                  <ul>{candidate.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              </div>
            )}

            <div className="cd-tabs" role="tablist" aria-label="Profile view">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  id={`cd-tab-${tab.key}`}
                  type="button"
                  role="tab"
                  aria-selected={view === tab.key}
                  aria-controls={`cd-tabpanel-${tab.key}`}
                  tabIndex={view === tab.key ? 0 : -1}
                  className={`cd-tab ${view === tab.key ? 'active' : ''}`}
                  onClick={() => setView(tab.key)}
                  onKeyDown={onTabKey}
                >
                  <tab.icon aria-hidden="true" /> {tab.label}
                </button>
              ))}
            </div>

            <div id={`cd-tabpanel-${view}`} role="tabpanel" aria-labelledby={`cd-tab-${view}`} className="cd-tabpanel">
              {view === 'graph' ? (
                <div className="cg-layout">
                  <section className="cd-panel cg-panel">
                    <p className="cd-muted cg-hint">Select a node to run a deep dive on it. Hover for details.</p>
                    <CandidateGraph
                      profile={profile}
                      selectedId={selectedId}
                      statuses={statuses}
                      onSelect={selectNode}
                      onShowDetails={() => setView('details')}
                    />
                  </section>
                  <DeepDivePanel
                    label={selectedLabel}
                    typeLabel={selectedId ? deepDiveTypeLabel(selectedId) : ''}
                    run={selectedId ? runs[selectedId] : undefined}
                    onRun={() => selectedId && startDeepDive(selectedId)}
                    onCancel={() => selectedId && controllers.current.get(selectedId)?.abort()}
                  />
                </div>
              ) : (
                <CandidateDetails candidate={candidate} />
              )}
            </div>
          </div>
        )}
      </div>

      {confirmDelete && candidate && (
        <ConfirmDialog
          title="Delete candidate"
          message={`Delete ${candidate.profile.fullName}'s profile? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

export default CandidateViewPage
