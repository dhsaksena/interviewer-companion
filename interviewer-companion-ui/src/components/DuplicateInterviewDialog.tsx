import { useState, type FormEvent } from 'react'
import './CategoryDialogs.css'
import Modal from './Modal'
import type { Interview } from '../types'
import { duplicateInterview } from '../api/interviewsApi'

interface DuplicateInterviewDialogProps {
  source: { id: number; title: string; candidateName: string; rubricCount: number; questionCount: number }
  onDuplicated: (interview: Interview) => void
  onClose: () => void
}

const DuplicateInterviewDialog = ({ source, onDuplicated, onClose }: DuplicateInterviewDialogProps) => {
  const [candidate, setCandidate] = useState('')
  const [title, setTitle] = useState(source.title)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = title.trim() !== '' && !submitting
  // The old candidate's name in the title is the most common thing to forget to change
  const staleName = source.candidateName !== '' && title.toLowerCase().includes(source.candidateName.toLowerCase())

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      onDuplicated(await duplicateInterview(source.id, title.trim(), candidate.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate interview')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Duplicate interview" onClose={onClose} closeOnOverlay={false}>
      <h2 className="dialog-title">Duplicate interview</h2>
      <form onSubmit={handleSubmit}>
        <label className="dialog-label" htmlFor="dup-candidate">New candidate</label>
        <input id="dup-candidate" className="dialog-input" value={candidate} onChange={e => setCandidate(e.target.value)} disabled={submitting} autoFocus aria-describedby="dup-candidate-hint" />
        <p id="dup-candidate-hint" className="dialog-hint">Leave blank to create a reusable template without a candidate.</p>
        <label className="dialog-label" htmlFor="dup-title" style={{ marginTop: 12 }}>Title</label>
        <input id="dup-title" className="dialog-input" value={title} onChange={e => setTitle(e.target.value)} disabled={submitting} />
        {staleName && <p className="dialog-hint warn">The title still mentions {source.candidateName}. Rename it if it shouldn't.</p>}
        <p className="dialog-message" style={{ marginTop: 10 }}>
          Copies {source.rubricCount} {source.rubricCount === 1 ? 'rubric' : 'rubrics'} and {source.questionCount} assigned {source.questionCount === 1 ? 'question' : 'questions'}
          {source.candidateName ? ` from ${source.candidateName}'s interview` : ''}. Ratings, feedback and notes are not copied.
        </p>
        {error && <p className="dialog-error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="dialog-btn secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="dialog-btn primary" disabled={!canSubmit}>{submitting ? 'Creating...' : 'Create copy'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default DuplicateInterviewDialog
