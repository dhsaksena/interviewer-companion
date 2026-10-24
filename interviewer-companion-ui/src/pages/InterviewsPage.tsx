import { useEffect, useState } from 'react'
import '../styles/QuestionsListPage.css'
import '../styles/Interviews.css'
import { MdAdd, MdSearch, MdInbox, MdOpenInNew, MdEdit, MdContentCopy, MdDelete } from 'react-icons/md'
import type { Interview, InterviewListQuery, InterviewSortKey, InterviewSummary } from '../types'
import PageHeader from '../components/PageHeader'
import { ConfirmDialog } from '../components/CategoryDialogs'
import DuplicateInterviewDialog from '../components/DuplicateInterviewDialog'
import { useToast } from '../components/Toast'
import { deleteInterview, fetchInterview, fetchInterviews } from '../api/interviewsApi'
import { formatRelative } from '../utils/formatRelative'
import InterviewPreview from '../components/InterviewPreview'
import StatusChip from '../components/StatusChip'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { STATUSES, STATUS_LABELS, formatDate } from '../utils/interviewStatus'
import { navigate, paths } from '../router'

const PAGE_SIZE = 10

const COLUMNS: { key: InterviewSortKey | 'status'; label: string; className?: string }[] = [
  { key: 'title', label: 'Interview' },
  { key: 'candidate', label: 'Candidate', className: 'col-candidate' },
  { key: 'status', label: 'Status', className: 'col-status' },
  { key: 'date', label: 'Interview date', className: 'col-date' },
  { key: 'rubrics', label: 'Rubrics', className: 'col-count' },
  { key: 'questions', label: 'Questions', className: 'col-count' },
  { key: 'updated', label: 'Updated', className: 'col-updated' },
]

const InterviewsPage = () => {
  const onNew = () => navigate(paths.interviewNew())
  const onOpen = (id: number) => navigate(paths.interviewView(id))
  const onEdit = (id: number) => navigate(paths.interviewEdit(id))
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [questions, setQuestions] = useState<InterviewListQuery['questions']>('all')
  const [status, setStatus] = useState<InterviewListQuery['status']>('all')
  const [sort, setSort] = useState<InterviewSortKey>('updated')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<InterviewSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Interview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<InterviewSummary | null>(null)
  const [toDuplicate, setToDuplicate] = useState<InterviewSummary | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchInterviews({ q: debouncedSearch, sort, dir, page, pageSize: PAGE_SIZE, questions, status })
      .then(result => {
        if (cancelled) return
        setItems(result.items)
        setTotal(result.total)
        setError(null)
        // Deleting the last row of the last page leaves it empty: step back
        const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
        if (page > lastPage) setPage(lastPage)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load interviews')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [debouncedSearch, sort, dir, page, questions, status, reloadKey])

  useEffect(() => {
    if (selectedId === null) return
    let cancelled = false
    fetchInterview(selectedId)
      .then(interview => { if (!cancelled) { setSelected(interview); setPreviewError(null) } })
      .catch(err => { if (!cancelled) setPreviewError(err instanceof Error ? err.message : 'Failed to load interview') })
    return () => { cancelled = true }
  }, [selectedId, reloadKey])

  const handleSort = (key: InterviewSortKey) => {
    if (key === sort) {
      setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(key)
      setDir(key === 'title' || key === 'candidate' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    await deleteInterview(toDelete.id)
    if (selectedId === toDelete.id) setSelectedId(null)
    setReloadKey(k => k + 1)
    toast('Interview deleted')
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtering = debouncedSearch !== '' || questions !== 'all' || status !== 'all'
  const summaryOf = (interview: Interview): InterviewSummary => ({
    id: interview.id,
    title: interview.title,
    candidateName: interview.candidateName,
    notes: interview.notes,
    status: interview.status,
    interviewDate: interview.interviewDate,
    updatedAt: interview.updatedAt,
    rubricCount: interview.rubrics.length,
    questionCount: interview.rubrics.reduce((n, r) => n + r.questions.length, 0),
    matchedRubric: null,
  })

  return (
    <div className="page">
      <PageHeader title="Interviews" actions={<span className="chip">{total} {total === 1 ? 'interview' : 'interviews'}</span>} />

      <div className="page-body">
        <div className="iv-split">
          <div className="iv-main">
            <div className="list-toolbar">
              <div className="search-box">
                <MdSearch />
                <input
                  type="search"
                  placeholder="Search by title, candidate, notes or rubric title..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search interviews"
                />
              </div>
              <select value={status} onChange={e => { setStatus(e.target.value as typeof status); setPage(1) }} aria-label="Filter by status">
                <option value="all">Any status</option>
                {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
              </select>
              <select value={questions} onChange={e => { setQuestions(e.target.value as typeof questions); setPage(1) }} aria-label="Filter by assigned questions">
                <option value="all">All interviews</option>
                <option value="with">Has questions assigned</option>
                <option value="without">No questions yet</option>
              </select>
            </div>

            {error && <ErrorBox message={error} onRetry={() => setReloadKey(k => k + 1)} />}
            {loading && items.length === 0 && !error && <LoadingState label="Loading interviews" />}

            {!loading && !error && items.length === 0 && (
              <div className="state-box">
                <MdInbox className="state-icon" />
                <p className="state-title">{filtering ? 'No matches' : 'No interviews yet'}</p>
                {!filtering && <p>Create one, add rubrics and attach questions from your bank.</p>}
                {!filtering && <button type="button" className="btn btn-primary" onClick={onNew}>New interview</button>}
                {filtering && (
                  <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setDebouncedSearch(''); setQuestions('all'); setStatus('all'); setPage(1) }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {items.length > 0 && (
              <p className="iv-hint">Click a row to preview it · double-click or click the title to open · press Enter on a row to open</p>
            )}
            {items.length > 0 && (
              <div className="table-card">
                <table className="questions-table iv-table">
                  <thead>
                    <tr>
                      {COLUMNS.map(col => (
                        <th
                          key={col.key}
                          className={`${col.className ?? ''} iv-sortable`}
                          aria-sort={sort === col.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          {col.key === 'status' ? col.label : (
                            <button type="button" onClick={() => handleSort(col.key as InterviewSortKey)}>
                              {col.label}{sort === col.key && <span className="iv-arrow">{dir === 'asc' ? '▲' : '▼'}</span>}
                            </button>
                          )}
                        </th>
                      ))}
                      <th className="col-row-actions"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className={loading ? 'iv-loading' : undefined}>
                    {items.map(item => (
                      <tr
                        key={item.id}
                        className={item.id === selectedId ? 'iv-selected' : undefined}
                        tabIndex={0}
                        aria-selected={item.id === selectedId}
                        onClick={() => setSelectedId(id => (id === item.id ? null : item.id))}
                        onDoubleClick={() => onOpen(item.id)}
                        onKeyDown={e => {
                          if (e.target !== e.currentTarget) return
                          if (e.key === 'Enter') onOpen(item.id)
                          else if (e.key === ' ') { e.preventDefault(); setSelectedId(id => (id === item.id ? null : item.id)) }
                        }}
                      >
                        <td className="title-cell">
                          <button type="button" className="title-link" title={item.title} onClick={e => { e.stopPropagation(); onOpen(item.id) }}>{item.title}</button>
                          <span className="iv-sub">
                            {item.matchedRubric ? <span className="iv-match">Rubric match: {item.matchedRubric}</span> : item.notes || 'No notes'}
                          </span>
                        </td>
                        <td>{item.candidateName || '—'}</td>
                        <td><StatusChip status={item.status} /></td>
                        <td className="iv-muted">{formatDate(item.interviewDate)}</td>
                        <td className="col-count">{item.rubricCount}</td>
                        <td className="col-count">{item.questionCount}</td>
                        <td className="iv-muted">{formatRelative(item.updatedAt)}</td>
                        <td className="actions-cell" onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
                          <div className="row-actions">
                            <button type="button" className="icon-btn" title="Open" aria-label={`Open ${item.title}`} onClick={() => onOpen(item.id)}><MdOpenInNew /></button>
                            <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item.id)}><MdEdit /></button>
                            <button type="button" className="icon-btn" title="Duplicate" aria-label={`Duplicate ${item.title}`} onClick={() => setToDuplicate(item)}><MdContentCopy /></button>
                            <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${item.title}`} onClick={() => setToDelete(item)}><MdDelete /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="iv-pager">
                  <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                  <div>
                    <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                    <span>Page {page} / {lastPage}</span>
                    <button type="button" className="btn btn-secondary" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Next ›</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="iv-preview">
            {selectedId === null && (
              <div className="iv-preview-empty">
                <strong>Select an interview</strong>
                <span>to preview its rubrics and questions here</span>
              </div>
            )}
            {selectedId !== null && previewError && <ErrorBox message={previewError} onRetry={() => setReloadKey(k => k + 1)} />}
            {selectedId !== null && !previewError && (!selected || selected.id !== selectedId) && <LoadingState label="Loading preview" rows={4} />}
            {selected && selected.id === selectedId && (
              <InterviewPreview
                interview={selected}
                onOpen={() => onOpen(selected.id)}
                onEdit={() => onEdit(selected.id)}
                onDuplicate={() => setToDuplicate(summaryOf(selected))}
                onDelete={() => setToDelete(summaryOf(selected))}
              />
            )}
          </div>
        </div>
      </div>

      <button type="button" className="fab" onClick={onNew} title="New interview (n)" aria-label="New interview">
        <MdAdd /> <span>New interview</span>
      </button>

      {toDelete && (
        <ConfirmDialog
          title="Delete interview"
          message={`Delete "${toDelete.title}" and its rubrics? Your questions in the bank are not affected.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        />
      )}

      {toDuplicate && (
        <DuplicateInterviewDialog
          source={toDuplicate}
          onClose={() => setToDuplicate(null)}
          onDuplicated={copy => {
            setToDuplicate(null)
            setSearch('')
            setDebouncedSearch('')
            setQuestions('all')
            setStatus('all')
            setSort('updated')
            setDir('desc')
            setPage(1)
            setSelectedId(copy.id)
            setReloadKey(k => k + 1)
            toast(copy.candidateName ? `Created interview for ${copy.candidateName}` : `Created "${copy.title}"`)
          }}
        />
      )}
    </div>
  )
}

export default InterviewsPage
