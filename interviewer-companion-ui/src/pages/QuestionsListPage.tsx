import { useState, useEffect, useMemo } from 'react'
import '../styles/QuestionsListPage.css'
import { MdEdit, MdDelete, MdAdd, MdSearch, MdInbox } from 'react-icons/md'
import type { Question } from '../types'
import PageHeader from '../components/PageHeader'
import { ConfirmDialog } from '../components/CategoryDialogs'
import { useToast } from '../components/Toast'

interface QuestionsListPageProps {
  // null shows every question
  selectedSubcategory: string | null
  onBack: () => void
  onSelectQuestion: (questionId: number) => void
  onViewQuestion: (questionId: number) => void
  onAddQuestion: () => void
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const DIFFICULTY_FILTERS = ['All', 'Easy', 'Medium', 'Hard']

const QuestionsListPage = ({ selectedSubcategory, onBack, onSelectQuestion, onViewQuestion, onAddQuestion }: QuestionsListPageProps) => {
  const toast = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [type, setType] = useState('All')
  const [toDelete, setToDelete] = useState<Question | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSearch('')
    setDifficulty('All')
    setType('All')

    const query = selectedSubcategory ? `?subcategory=${encodeURIComponent(selectedSubcategory)}` : ''
    fetch(`${apiUrl}/questions${query}`)
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
  }, [selectedSubcategory])

  const types = useMemo(() => ['All', ...Array.from(new Set(questions.map(q => q.type)))], [questions])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return questions.filter(q =>
      (!needle || q.title.toLowerCase().includes(needle)) &&
      (difficulty === 'All' || q.difficulty === difficulty) &&
      (type === 'All' || q.type === type)
    )
  }, [questions, search, difficulty, type])

  const handleDelete = async () => {
    if (!toDelete) return
    const response = await fetch(`${apiUrl}/questions/${toDelete.id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete question')
    setQuestions(prev => prev.filter(q => q.id !== toDelete.id))
    toast('Question deleted')
  }

  const filtering = search.trim() !== '' || difficulty !== 'All' || type !== 'All'
  const title = selectedSubcategory ?? 'All questions'

  return (
    <div className="page">
      <PageHeader
        title={title}
        crumbs={[{ label: 'Home', onClick: onBack }, { label: title }]}
        actions={<span className="chip">{questions.length} {questions.length === 1 ? 'question' : 'questions'}</span>}
      />

      <div className="page-body">
        {loading && <div className="state-box">Loading questions...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && questions.length === 0 && (
          <div className="state-box">
            <MdInbox className="state-icon" />
            <p className="state-title">No questions yet</p>
            <p>Use the + button to add the first one{selectedSubcategory ? ` to ${selectedSubcategory}` : ''}.</p>
          </div>
        )}

        {!loading && !error && questions.length > 0 && (
          <>
            <div className="list-toolbar">
              <div className="search-box">
                <MdSearch />
                <input
                  type="search"
                  placeholder="Search questions..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search questions"
                />
              </div>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} aria-label="Filter by difficulty">
                {DIFFICULTY_FILTERS.map(d => <option key={d} value={d}>{d === 'All' ? 'All difficulties' : d}</option>)}
              </select>
              <select value={type} onChange={e => setType(e.target.value)} aria-label="Filter by type">
                {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All types' : t}</option>)}
              </select>
            </div>

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
                      <th className="col-num">#</th>
                      <th>Title</th>
                      <th className="col-type">Type</th>
                      <th className="col-difficulty">Difficulty</th>
                      <th className="col-actions"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((question, index) => (
                      <tr key={question.id}>
                        <td className="num-cell">{index + 1}</td>
                        <td className="title-cell">
                          <button type="button" className="title-link" onClick={() => onViewQuestion(question.id)} title={question.title}>
                            {question.title}
                          </button>
                        </td>
                        <td className="type-cell">{question.type}</td>
                        <td>
                          <span className={`chip difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
                        </td>
                        <td className="actions-cell">
                          <div className="row-actions">
                            <button type="button" className="icon-btn" onClick={() => onSelectQuestion(question.id)} title="Edit question" aria-label={`Edit ${question.title}`}>
                              <MdEdit />
                            </button>
                            <button type="button" className="icon-btn danger" onClick={() => setToDelete(question)} title="Delete question" aria-label={`Delete ${question.title}`}>
                              <MdDelete />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filtering && visible.length > 0 && (
              <p className="filter-note">Showing {visible.length} of {questions.length}</p>
            )}
          </>
        )}
      </div>

      <button type="button" className="fab" onClick={onAddQuestion} title="Add question" aria-label="Add question">
        <MdAdd /> <span>New question</span>
      </button>

      {toDelete && (
        <ConfirmDialog
          title="Delete question"
          message={`Delete "${toDelete.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  )
}

export default QuestionsListPage
