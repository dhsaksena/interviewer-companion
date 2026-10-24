import { useEffect, useState, type FormEvent } from 'react'
import './CategoryDialogs.css'
import Modal from './Modal'
import type { Interview, InterviewSummary } from '../types'
import { fetchInterview, fetchInterviews, toInterviewInput, updateInterview } from '../api/interviewsApi'

interface AddToInterviewDialogProps {
  questionIds: number[]
  onClose: () => void
  onAdded: (interview: Interview, added: number) => void
}

const NEW_RUBRIC = 'new'

// Assigns one or more bank questions to a rubric of an existing interview, without opening the editor
const AddToInterviewDialog = ({ questionIds, onClose, onAdded }: AddToInterviewDialogProps) => {
  const [interviews, setInterviews] = useState<InterviewSummary[] | null>(null)
  const [interviewId, setInterviewId] = useState('')
  const [interview, setInterview] = useState<Interview | null>(null)
  const [rubric, setRubric] = useState('')
  const [newRubricTitle, setNewRubricTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInterviews({ q: '', sort: 'updated', dir: 'desc', page: 1, pageSize: 100, questions: 'all', status: 'all' })
      .then(result => setInterviews(result.items))
      .catch(err => { setInterviews([]); setError(err instanceof Error ? err.message : 'Failed to load interviews') })
  }, [])

  const chooseInterview = (id: string) => {
    setInterview(null)
    setRubric('')
    setInterviewId(id)
  }

  useEffect(() => {
    if (!interviewId) return
    let cancelled = false
    fetchInterview(Number(interviewId))
      .then(data => {
        if (cancelled) return
        setInterview(data)
        setRubric(data.rubrics.length > 0 ? String(data.rubrics[0].id) : NEW_RUBRIC)
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load interview') })
    return () => { cancelled = true }
  }, [interviewId])

  const creatingRubric = rubric === NEW_RUBRIC
  const canSubmit = interview !== null && rubric !== '' && (!creatingRubric || newRubricTitle.trim() !== '') && !submitting

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !interview) return
    setSubmitting(true)
    setError(null)
    try {
      // Re-read right before saving so edits made elsewhere since the dialog opened are not overwritten
      const fresh = await fetchInterview(interview.id)
      const input = toInterviewInput(fresh)
      if (creatingRubric) {
        input.rubrics.push({ title: newRubricTitle.trim(), description: '', rating: null, feedback: '', questionIds: [] })
      }
      const target = creatingRubric ? input.rubrics[input.rubrics.length - 1] : input.rubrics[fresh.rubrics.findIndex(r => String(r.id) === rubric)]
      const addedIds = questionIds.filter(id => !target.questionIds.includes(id))
      target.questionIds.push(...addedIds)
      onAdded(await updateInterview(fresh.id, input), addedIds.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to interview')
      setSubmitting(false)
    }
  }

  const label = questionIds.length === 1 ? 'question' : 'questions'

  return (
    <Modal title="Add to interview" onClose={onClose} closeOnOverlay={false}>
      <h2 className="dialog-title">Add {questionIds.length} {label} to an interview</h2>
      <form onSubmit={handleSubmit}>
        <label className="dialog-label" htmlFor="ati-interview">Interview</label>
        <select id="ati-interview" className="dialog-input" value={interviewId} onChange={e => chooseInterview(e.target.value)} disabled={submitting || interviews === null} autoFocus>
          <option value="">{interviews === null ? 'Loading...' : interviews.length === 0 ? 'No interviews yet' : 'Choose an interview'}</option>
          {interviews?.map(i => <option key={i.id} value={i.id}>{i.title}{i.candidateName ? ` — ${i.candidateName}` : ''}</option>)}
        </select>

        {interviewId && (
          <>
            <label className="dialog-label" htmlFor="ati-rubric" style={{ marginTop: 12 }}>Rubric</label>
            <select id="ati-rubric" className="dialog-input" value={rubric} onChange={e => setRubric(e.target.value)} disabled={submitting || !interview}>
              {!interview && <option value="">Loading...</option>}
              {interview?.rubrics.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              {interview && <option value={NEW_RUBRIC}>＋ New rubric…</option>}
            </select>
          </>
        )}

        {creatingRubric && (
          <>
            <label className="dialog-label" htmlFor="ati-title" style={{ marginTop: 12 }}>New rubric title</label>
            <input id="ati-title" className="dialog-input" value={newRubricTitle} onChange={e => setNewRubricTitle(e.target.value)} disabled={submitting} placeholder="e.g. System design depth" />
          </>
        )}

        {error && <p className="dialog-error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="dialog-btn secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="dialog-btn primary" disabled={!canSubmit}>{submitting ? 'Adding...' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default AddToInterviewDialog
