import { useState, useEffect, useMemo } from 'react'
import '../styles/QuestionsListPage.css'
import '../styles/Interviews.css'
import { MdEdit, MdDelete, MdAdd, MdSearch, MdInbox, MdPlaylistAdd } from 'react-icons/md'
import type { InterviewUsage, Question } from '../types'
import PageHeader from '../components/PageHeader'
import { ConfirmDialog } from '../components/CategoryDialogs'
import AddToInterviewDialog from '../components/AddToInterviewDialog'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import { API_URL, apiFetch } from '../api/apiFetch'
import { fetchQuestionUsage } from '../api/interviewsApi'
import { usageMessage } from '../utils/usageMessage'
import { navigate, paths } from '../router'

interface QuestionsListPageProps {
  // null shows every question
  selectedSubcategory: string | null
}

const apiUrl = API_URL

const DIFFICULTY_FILTERS = ['All', 'Easy', 'Medium', 'Hard']
const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 }
const PAGE_SIZE = 25

type SortKey = 'title' | 'topic' | 'type' | 'difficulty'

const compare = (a: Question, b: Question, key: SortKey) => {
  if (key === 'difficulty') return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
  if (key === 'topic') return `${a.category}/${a.subcategory}`.localeCompare(`${b.category}/${b.subcategory}`)
  return a[key].localeCompare(b[key])
}

const QuestionsListPage = ({ selectedSubcategory }: QuestionsListPageProps) => {
  const toast = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [type, setType] = useState('All')
  const [sort, setSort] = useState<SortKey | null>(null)
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [toDelete, setToDelete] = useState<{ ids: number[]; message: string } | null>(null)
  const [assigning, setAssigning] = useState<number[] | null>(null)

  const here = paths.questions(selectedSubcategory)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSearch('')
    setDifficulty('All')
    setType('All')
    setPage(1)
    setChecked(new Set())

    const query = selectedSubcategory ? `?subcategory=${encodeURIComponent(selectedSubcategory)}` : ''
    apiFetch(`${apiUrl}/questions${query}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch questions')
        return response.json()
      })
      .then(data => {
        if (cancelled) return
        setQuestions(data)
        setError(null)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch questions')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedSubcategory, reloadKey])

  const types = useMemo(() => ['All', ...Array.from(new Set(questions.map(q => q.type)))], [questions])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = questions.filter(q =>
      (!needle || q.title.toLowerCase().includes(needle)) &&
      (difficulty === 'All' || q.difficulty === difficulty) &&
      (type === 'All' || q.type === type)
    )
    if (!sort) return filtered
    const sign = dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => sign * compare(a, b, sort))
  }, [questions, search, difficulty, type, sort, dir])

  const lastPage = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, lastPage)
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (sort === key) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(key); setDir('asc') }
    setPage(1)
  }

  const refine = (apply: () => void) => { apply(); setPage(1) }

  const toggleChecked = (id: number) =>
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allOnPageChecked = pageRows.length > 0 && pageRows.every(q => checked.has(q.id))
  const togglePage = () =>
    setChecked(prev => {
      const next = new Set(prev)
      for (const q of pageRows) {
        if (allOnPageChecked) next.delete(q.id)
        else next.add(q.id)
      }
      return next
    })

  const askDelete = async (ids: number[]) => {
    // Deleting a question also removes it from interview rubrics, so warn about where it is used
    const results = await Promise.all(ids.map(id => fetchQuestionUsage(id).catch((): InterviewUsage[] => [])))
    const used = new Map<number, InterviewUsage>()
    results.flat().forEach(u => used.set(u.id, u))
    const usage = [...used.values()]
    const what = ids.length === 1 ? `"${questions.find(q => q.id === ids[0])?.title}"` : `${ids.length} questions`
    setToDelete({ ids, message: usageMessage(what, usage) })
  }

  const handleDelete = async () => {
    if (!toDelete) return
    for (const id of toDelete.ids) {
      const response = await apiFetch(`${apiUrl}/questions/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete question')
      setQuestions(prev => prev.filter(q => q.id !== id))
      setChecked(prev => { const next = new Set(prev); next.delete(id); return next })
    }
    toast(toDelete.ids.length === 1 ? 'Question deleted' : `${toDelete.ids.length} questions deleted`)
  }

  const filtering = search.trim() !== '' || difficulty !== 'All' || type !== 'All'
  const title = selectedSubcategory ?? 'All questions'
  const showTopic = selectedSubcategory === null

  const header = (key: SortKey, label: string, className?: string) => (
    <th className={`${className ?? ''} iv-sortable`} aria-sort={sort === key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => handleSort(key)}>
        {label}{sort === key && <span className="iv-arrow">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  )

  return (
    <div className="page">
      <PageHeader
        title={title}
        crumbs={[{ label: 'Home', onClick: () => navigate(paths.home()) }, { label: title }]}
        actions={
          <span className="chip">
            {filtering ? `${visible.length} of ${questions.length}` : questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </span>
        }
      />

      <div className="page-body">
        {loading && <LoadingState label="Loading questions" />}
        {error && <ErrorBox message={error} onRetry={() => setReloadKey(k => k + 1)} />}

        {!loading && !error && questions.length === 0 && (
          <div className="state-box">
            <MdInbox className="state-icon" />
            <p className="state-title">No questions yet</p>
            <p>Add the first one{selectedSubcategory ? ` to ${selectedSubcategory}` : ''}.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate(paths.questionNew(selectedSubcategory))}>
              <MdAdd /> New question
            </button>
          </div>
        )}

        {!loading && !error && questions.length > 0 && (
          <>
            <div className="list-toolbar">
              <div className="search-box">
                <MdSearch />
                <input
                  type="search"
                  placeholder="Search questions...  (press / to focus)"
                  value={search}
                  onChange={e => refine(() => setSearch(e.target.value))}
                  aria-label="Search questions"
                />
              </div>
              <select value={difficulty} onChange={e => refine(() => setDifficulty(e.target.value))} aria-label="Filter by difficulty">
                {DIFFICULTY_FILTERS.map(d => <option key={d} value={d}>{d === 'All' ? 'All difficulties' : d}</option>)}
              </select>
              <select value={type} onChange={e => refine(() => setType(e.target.value))} aria-label="Filter by type">
                {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All types' : t}</option>)}
              </select>
            </div>

            {checked.size > 0 && (
              <div className="bulk-bar" role="region" aria-label="Bulk actions">
                <strong>{checked.size} selected</strong>
                <button type="button" className="btn btn-secondary" onClick={() => setAssigning([...checked])}><MdPlaylistAdd /> Add to interview</button>
                <button type="button" className="btn btn-danger-outline" onClick={() => askDelete([...checked])}><MdDelete /> Delete</button>
                <button type="button" className="btn btn-ghost" onClick={() => setChecked(new Set())}>Clear</button>
              </div>
            )}

            {visible.length === 0 ? (
              <div className="state-box">
                <p className="state-title">No matches</p>
                <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setDifficulty('All'); setType('All') }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="table-card">
                <table className="questions-table">
                  <thead>
                    <tr>
                      <th className="col-check">
                        <input type="checkbox" checked={allOnPageChecked} onChange={togglePage} aria-label="Select all questions on this page" />
                      </th>
                      {header('title', 'Title')}
                      {showTopic && header('topic', 'Topic', 'col-topic')}
                      {header('type', 'Type', 'col-type')}
                      {header('difficulty', 'Difficulty', 'col-difficulty')}
                      <th className="col-actions"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(question => (
                      <tr key={question.id} className={checked.has(question.id) ? 'iv-selected' : undefined}>
                        <td className="col-check">
                          <input type="checkbox" checked={checked.has(question.id)} onChange={() => toggleChecked(question.id)} aria-label={`Select ${question.title}`} />
                        </td>
                        <td className="title-cell">
                          <button type="button" className="title-link" onClick={() => navigate(paths.questionView(question.id, here))} title={question.title}>
                            {question.title}
                          </button>
                        </td>
                        {showTopic && <td className="type-cell">{question.category}{question.subcategory ? ` › ${question.subcategory}` : ''}</td>}
                        <td className="type-cell">{question.type}</td>
                        <td>
                          <span className={`chip difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
                        </td>
                        <td className="actions-cell">
                          <div className="row-actions">
                            <button type="button" className="icon-btn" onClick={() => setAssigning([question.id])} title="Add to interview" aria-label={`Add ${question.title} to an interview`}>
                              <MdPlaylistAdd />
                            </button>
                            <button type="button" className="icon-btn" onClick={() => navigate(paths.questionEdit(question.id, here))} title="Edit question" aria-label={`Edit ${question.title}`}>
                              <MdEdit />
                            </button>
                            <button type="button" className="icon-btn danger" onClick={() => askDelete([question.id])} title="Delete question" aria-label={`Delete ${question.title}`}>
                              <MdDelete />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lastPage > 1 && (
                  <div className="iv-pager">
                    <span>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length}</span>
                    <div>
                      <button type="button" className="btn btn-secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹ Prev</button>
                      <span>Page {currentPage} / {lastPage}</span>
                      <button type="button" className="btn btn-secondary" disabled={currentPage >= lastPage} onClick={() => setPage(currentPage + 1)}>Next ›</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <button type="button" className="fab" onClick={() => navigate(paths.questionNew(selectedSubcategory))} title="Add question (n)" aria-label="Add question">
        <MdAdd /> <span>New question</span>
      </button>

      {toDelete && (
        <ConfirmDialog
          title={toDelete.ids.length === 1 ? 'Delete question' : 'Delete questions'}
          message={toDelete.message}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        />
      )}

      {assigning && (
        <AddToInterviewDialog
          questionIds={assigning}
          onClose={() => setAssigning(null)}
          onAdded={(interview, added) => {
            setAssigning(null)
            setChecked(new Set())
            toast(added === 0 ? `Already in "${interview.title}"` : `Added ${added} ${added === 1 ? 'question' : 'questions'} to "${interview.title}"`)
          }}
        />
      )}
    </div>
  )
}

export default QuestionsListPage
