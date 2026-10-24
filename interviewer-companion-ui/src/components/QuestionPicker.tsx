import { useMemo, useState } from 'react'
import { MdSearch } from 'react-icons/md'
import './CategoryDialogs.css'
import '../styles/QuestionsListPage.css'
import '../styles/Interviews.css'
import Modal from './Modal'
import type { Question } from '../types'

interface QuestionPickerProps {
  // The whole bank, loaded once by the editor
  questions: Question[]
  // Already assigned to this rubric, in order
  initialSelected: number[]
  // question id -> names of the other rubrics in this interview that already use it
  usedElsewhere: Map<number, string[]>
  onConfirm: (questionIds: number[]) => void
  onClose: () => void
}

const unique = (values: string[]) => ['All', ...new Set(values.filter(Boolean))]

const QuestionPicker = ({ questions, initialSelected, usedElsewhere, onConfirm, onClose }: QuestionPickerProps) => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [type, setType] = useState('All')
  const [selectedOnly, setSelectedOnly] = useState(false)
  // An array (not a Set) so questions keep the order they were picked in
  const [selected, setSelected] = useState<number[]>(initialSelected)

  const categories = useMemo(() => unique(questions.map(q => q.category)), [questions])
  const types = useMemo(() => unique(questions.map(q => q.type)), [questions])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return questions.filter(q =>
      (!needle || q.title.toLowerCase().includes(needle)) &&
      (category === 'All' || q.category === category) &&
      (difficulty === 'All' || q.difficulty === difficulty) &&
      (type === 'All' || q.type === type) &&
      (!selectedOnly || selected.includes(q.id))
    )
  }, [questions, search, category, difficulty, type, selectedOnly, selected])

  const toggle = (id: number) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const allVisibleSelected = visible.length > 0 && visible.every(q => selected.includes(q.id))
  const toggleVisible = () =>
    setSelected(prev => {
      if (allVisibleSelected) return prev.filter(id => !visible.some(q => q.id === id))
      const missing = visible.filter(q => !prev.includes(q.id)).map(q => q.id)
      return [...prev, ...missing]
    })

  return (
    <Modal title="Assign questions" onClose={onClose} closeOnOverlay={false} className="iv-modal">
      <div className="iv-modal-head">
        <h2 className="dialog-title">Assign questions from your bank</h2>
        <div className="iv-modal-filters">
          <div className="search-box">
            <MdSearch />
            <input
              type="search"
              placeholder="Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search questions"
              autoFocus
            />
          </div>
        </div>
        <div className="iv-modal-filters">
          <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category">
            {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}
          </select>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} aria-label="Filter by difficulty">
            {['All', 'Easy', 'Medium', 'Hard'].map(d => <option key={d} value={d}>{d === 'All' ? 'All difficulties' : d}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)} aria-label="Filter by type">
            {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All types' : t}</option>)}
          </select>
        </div>
        <div className="iv-modal-tools">
          <label className="iv-check">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} disabled={visible.length === 0} />
            {allVisibleSelected ? 'Deselect' : 'Select'} all {visible.length} shown
          </label>
          <label className="iv-check">
            <input type="checkbox" checked={selectedOnly} onChange={e => setSelectedOnly(e.target.checked)} />
            Selected only
          </label>
        </div>
      </div>

      <div className="iv-modal-body">
        {questions.length === 0 && <div className="state-box">Your question bank is empty. Add questions first.</div>}
        {questions.length > 0 && visible.length === 0 && <div className="state-box">No questions match</div>}
        {visible.map(q => {
          const others = usedElsewhere.get(q.id)
          return (
            <label key={q.id} className="iv-pick">
              <input type="checkbox" checked={selected.includes(q.id)} onChange={() => toggle(q.id)} />
              <span className="iv-pick-title" title={q.title}>{q.title}</span>
              {others && <span className="chip iv-used" title={`Also in: ${others.join(', ')}`}>Also in {others.length === 1 ? others[0] : `${others.length} rubrics`}</span>}
              <span className="chip">{q.category}</span>
              <span className={`chip difficulty-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
            </label>
          )
        })}
      </div>

      <div className="iv-modal-foot">
        <span className="iv-muted">{selected.length} selected</span>
        <div className="dialog-actions">
          <button type="button" className="dialog-btn secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="dialog-btn primary" onClick={() => onConfirm(selected)}>Assign</button>
        </div>
      </div>
    </Modal>
  )
}

export default QuestionPicker
