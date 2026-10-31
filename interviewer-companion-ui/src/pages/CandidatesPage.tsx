import { useEffect, useState } from 'react'
import '../styles/QuestionsListPage.css'
import '../styles/Interviews.css'
import '../styles/Candidates.css'
import { MdSearch, MdDelete, MdPersonAdd, MdPeopleOutline } from 'react-icons/md'
import type { CandidateSummary } from '../types'
import PageHeader from '../components/PageHeader'
import { ConfirmDialog } from '../components/CategoryDialogs'
import ImportResumeDialog from '../components/ImportResumeDialog'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import { deleteCandidate, fetchCandidates } from '../api/candidatesApi'
import { formatRelative } from '../utils/formatRelative'
import { initialsOf } from '../utils/candidateStats'
import { navigate, paths } from '../router'

const PAGE_SIZE = 12

const CandidatesPage = () => {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<CandidateSummary[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Loading until the response for the current query arrives
  const queryKey = `${debouncedSearch}|${page}|${reloadKey}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const loading = loadedKey !== queryKey
  const [importing, setImporting] = useState(false)
  const [toDelete, setToDelete] = useState<CandidateSummary | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    fetchCandidates(debouncedSearch, page, PAGE_SIZE)
      .then(result => {
        if (cancelled) return
        setItems(result.items)
        setTotal(result.total)
        setError(null)
        // Deleting the last card of the last page leaves it empty: step back
        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
        if (page > lastPage) setPage(lastPage)
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load candidates') })
      .finally(() => { if (!cancelled) setLoadedKey(queryKey) })
    return () => { cancelled = true }
  }, [debouncedSearch, page, reloadKey, queryKey])

  const handleDelete = async () => {
    if (!toDelete) return
    await deleteCandidate(toDelete.id)
    setReloadKey(k => k + 1)
    toast('Candidate deleted')
  }

  const open = (id: number) => navigate(paths.candidateView(id))
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="page">
      <PageHeader title="Candidates" actions={<span className="chip">{total} {total === 1 ? 'candidate' : 'candidates'}</span>} />

      <div className="page-body">
        <div className="list-toolbar">
          <div className="search-box">
            <MdSearch />
            <input
              type="search"
              placeholder="Search by name, title, company or skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search candidates"
            />
          </div>
        </div>

        {error && <ErrorBox message={error} onRetry={() => setReloadKey(k => k + 1)} />}
        {loading && items.length === 0 && !error && <LoadingState label="Loading candidates" />}

        {!loading && !error && items.length === 0 && (
          <div className="state-box">
            <MdPeopleOutline className="state-icon" />
            <p className="state-title">{debouncedSearch ? 'No matches' : 'No candidates yet'}</p>
            {!debouncedSearch && <p>Import a resume to see the candidate's profile at a glance.</p>}
            {!debouncedSearch
              ? <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}>Import resume</button>
              : <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setDebouncedSearch('') }}>Clear search</button>}
          </div>
        )}

        {items.length > 0 && (
          <>
            <ul className={`cd-grid ${loading ? 'iv-loading' : ''}`}>
              {items.map(item => (
                <li key={item.id} className="cd-card">
                  <button type="button" className="cd-card-main" onClick={() => open(item.id)}>
                    <span className="cd-avatar" aria-hidden="true">{initialsOf(item.fullName)}</span>
                    <span className="cd-card-text">
                      <strong title={item.fullName}>{item.fullName}</strong>
                      <span className="cd-muted" title={item.headline}>{item.headline || 'No current role listed'}</span>
                    </span>
                  </button>
                  {item.topSkills.length > 0 && (
                    <div className="cd-chips" aria-label="Top skills">
                      {item.topSkills.map(skill => <span key={skill} className="chip">{skill}</span>)}
                    </div>
                  )}
                  <div className="cd-card-foot">
                    <span className="cd-muted">Imported {formatRelative(item.updatedAt)}</span>
                    <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${item.fullName}`} onClick={() => setToDelete(item)}>
                      <MdDelete />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {lastPage > 1 && (
              <div className="iv-pager">
                <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                <div>
                  <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                  <span>Page {page} / {lastPage}</span>
                  <button type="button" className="btn btn-secondary" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Next ›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button type="button" className="fab" onClick={() => setImporting(true)} title="Import resume (n)" aria-label="Import resume">
        <MdPersonAdd /> <span>Import resume</span>
      </button>

      {importing && (
        <ImportResumeDialog
          onClose={() => setImporting(false)}
          onImported={candidate => {
            toast(`Imported ${candidate.profile.fullName}`)
            setReloadKey(k => k + 1)
          }}
          onOpen={candidate => {
            setImporting(false)
            open(candidate.id)
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete candidate"
          message={`Delete ${toDelete.fullName}'s profile? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  )
}

export default CandidatesPage
