import { useEffect, useMemo, useState } from 'react'
import '../styles/QuestionForm.css'
import '../styles/Interviews.css'
import { MdArrowUpward, MdArrowDownward, MdDelete, MdAdd, MdClose } from 'react-icons/md'
import type { Interview, InterviewStatus, Question } from '../types'
import PageHeader from '../components/PageHeader'
import QuestionPicker from '../components/QuestionPicker'
import { ConfirmDialog } from '../components/CategoryDialogs'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import { createInterview, fetchInterview, updateInterview } from '../api/interviewsApi'
import { API_URL, apiFetch } from '../api/apiFetch'
import { STATUSES, STATUS_LABELS } from '../utils/interviewStatus'
import { navigate, paths, useUnsavedGuard } from '../router'

interface InterviewEditPageProps {
  // null creates a new interview
  interviewId: number | null
}

interface RubricDraft {
  key: number
  title: string
  description: string
  // Captured on the interview page; carried through here so saving an edit never wipes them
  rating: number | null
  feedback: string
  questionIds: number[]
}

let rubricKeyCounter = 0
const nextRubricKey = () => rubricKeyCounter++
const blankRubric = (): RubricDraft => ({ key: nextRubricKey(), title: '', description: '', rating: null, feedback: '', questionIds: [] })

// Everything the user can change, without the React-only keys: used to detect unsaved edits
const snapshotOf = (fields: { title: string; candidateName: string; notes: string; status: InterviewStatus; interviewDate: string; rubrics: RubricDraft[] }) =>
  JSON.stringify({
    ...fields,
    rubrics: fields.rubrics.map(r => ({ title: r.title, description: r.description, rating: r.rating, feedback: r.feedback, questionIds: r.questionIds })),
  })

const EMPTY_SNAPSHOT = snapshotOf({ title: '', candidateName: '', notes: '', status: 'draft', interviewDate: '', rubrics: [blankRubric()] })

const InterviewEditPage = ({ interviewId }: InterviewEditPageProps) => {
  const toast = useToast()
  const backPath = interviewId === null ? paths.interviews() : paths.interviewView(interviewId)
  const onBack = () => navigate(backPath)

  const [loading, setLoading] = useState(interviewId !== null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [title, setTitle] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<InterviewStatus>('draft')
  const [interviewDate, setInterviewDate] = useState('')
  const [rubrics, setRubrics] = useState<RubricDraft[]>(() => (interviewId === null ? [blankRubric()] : []))
  const [baseline, setBaseline] = useState<string | null>(interviewId === null ? EMPTY_SNAPSHOT : null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsError, setQuestionsError] = useState(false)
  const [questionsReload, setQuestionsReload] = useState(0)
  const [pickerFor, setPickerFor] = useState<number | null>(null)
  const [rubricToRemove, setRubricToRemove] = useState<RubricDraft | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // The bank is loaded once here and shared with the picker. A failure is shown, never silently ignored
  useEffect(() => {
    let cancelled = false
    apiFetch(`${API_URL}/questions`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load questions')
        return response.json()
      })
      .then(data => { if (!cancelled) setQuestions(data) })
      .catch(() => { if (!cancelled) setQuestionsError(true) })
    return () => { cancelled = true }
  }, [questionsReload])

  useEffect(() => {
    if (interviewId === null) return
    let cancelled = false
    fetchInterview(interviewId)
      .then((interview: Interview) => {
        if (cancelled) return
        const drafts = interview.rubrics.map(r => ({
          key: nextRubricKey(),
          title: r.title,
          description: r.description,
          rating: r.rating,
          feedback: r.feedback,
          questionIds: r.questions.map(q => q.id),
        }))
        const date = interview.interviewDate ?? ''
        setTitle(interview.title)
        setCandidateName(interview.candidateName)
        setNotes(interview.notes)
        setStatus(interview.status)
        setInterviewDate(date)
        setRubrics(drafts)
        setBaseline(snapshotOf({ title: interview.title, candidateName: interview.candidateName, notes: interview.notes, status: interview.status, interviewDate: date, rubrics: drafts }))
      })
      .catch(err => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load interview') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [interviewId, reloadKey])

  const dirty = baseline !== null && snapshotOf({ title, candidateName, notes, status, interviewDate, rubrics }) !== baseline
  useUnsavedGuard(dirty && !saving)

  const questionById = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])

  const updateRubric = (key: number, patch: Partial<RubricDraft>) =>
    setRubrics(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))

  const moveRubric = (index: number, delta: number) =>
    setRubrics(prev => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const moveQuestion = (rubric: RubricDraft, index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= rubric.questionIds.length) return
    const ids = [...rubric.questionIds]
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    updateRubric(rubric.key, { questionIds: ids })
  }

  const removeRubric = (rubric: RubricDraft) => {
    // Empty rubrics go straight away; ones with content ask first
    if (rubric.questionIds.length > 0 || rubric.title.trim() || rubric.description.trim()) setRubricToRemove(rubric)
    else setRubrics(prev => prev.filter(r => r.key !== rubric.key))
  }

  const titleMissing = title.trim() === ''
  const rubricTitleMissing = rubrics.some(r => r.title.trim() === '')
  const questionCount = rubrics.reduce((n, r) => n + r.questionIds.length, 0)

  const handleSave = async () => {
    setSubmitted(true)
    if (titleMissing || rubricTitleMissing || saving) return

    setSaving(true)
    setSaveError(null)
    const input = {
      title: title.trim(),
      candidateName: candidateName.trim(),
      notes: notes.trim(),
      status,
      interviewDate: interviewDate || null,
      rubrics: rubrics.map(r => ({
        title: r.title.trim(),
        description: r.description.trim(),
        rating: r.rating,
        feedback: r.feedback,
        questionIds: r.questionIds,
      })),
    }
    try {
      const saved = interviewId === null ? await createInterview(input) : await updateInterview(interviewId, input)
      toast('Interview saved')
      navigate(paths.interviewView(saved.id), { force: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save interview')
      setSaving(false)
    }
  }

  const heading = interviewId === null ? 'New interview' : 'Edit interview'
  const pickerRubric = rubrics.find(r => r.key === pickerFor)
  const rubricName = (r: RubricDraft, index: number) => r.title.trim() || `Rubric ${index + 1}`

  // For each question, the other rubrics of this interview that already include it
  const usedElsewhere = useMemo(() => {
    const map = new Map<number, string[]>()
    if (!pickerRubric) return map
    rubrics.forEach((r, index) => {
      if (r.key === pickerRubric.key) return
      for (const id of r.questionIds) map.set(id, [...(map.get(id) ?? []), rubricName(r, index)])
    })
    return map
  }, [rubrics, pickerRubric])

  return (
    <div className="page">
      <PageHeader
        title={heading}
        crumbs={[{ label: 'Interviews', onClick: () => navigate(paths.interviews()) }, { label: heading }]}
        onBack={onBack}
        backDisabled={saving}
      />

      <div className="page-body">
        {loading && <LoadingState label="Loading interview" rows={4} />}
        {loadError && <ErrorBox message={loadError} onRetry={() => { setLoadError(null); setLoading(true); setReloadKey(k => k + 1) }} />}

        {!loading && !loadError && (
          <div className="iv-edit">
            <div className="iv-edit-main">
              {questionsError && (
                <ErrorBox message="Couldn't load your question bank, so assigned questions can't be shown or changed." onRetry={() => { setQuestionsError(false); setQuestionsReload(k => k + 1) }} />
              )}

              <section className="iv-card">
                <div className="iv-fields">
                  <div className="field">
                    <label className="field-label" htmlFor="iv-title">Interview title <span className="req">*</span></label>
                    <input id="iv-title" type="text" value={title} maxLength={255} onChange={e => setTitle(e.target.value)}
                      className={submitted && titleMissing ? 'invalid' : undefined} placeholder="e.g. Senior Backend Engineer – Round 1" autoFocus={interviewId === null} />
                    {submitted && titleMissing && <span className="field-error">Give the interview a title</span>}
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="iv-candidate">Candidate</label>
                    <input id="iv-candidate" type="text" value={candidateName} maxLength={255} onChange={e => setCandidateName(e.target.value)} placeholder="Candidate name" />
                  </div>
                </div>
                <div className="iv-fields" style={{ marginTop: 14 }}>
                  <div className="field">
                    <label className="field-label" htmlFor="iv-date">Interview date</label>
                    <input id="iv-date" type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="iv-status">Status</label>
                    <select id="iv-status" value={status} onChange={e => setStatus(e.target.value as InterviewStatus)}>
                      {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label className="field-label" htmlFor="iv-notes">Notes</label>
                  <textarea id="iv-notes" className="iv-textarea" value={notes} maxLength={5000} onChange={e => setNotes(e.target.value)} placeholder="Level, source, anything to remember…" />
                </div>
              </section>

              <h2 className="iv-section-title">Rubrics</h2>
              {rubrics.map((rubric, index) => (
                <section key={rubric.key} className="iv-card">
                  <div className="iv-rubric-head">
                    <span className="iv-num">{index + 1}</span>
                    <input type="text" value={rubric.title} maxLength={255} aria-label={`Rubric ${index + 1} title`}
                      className={`iv-rubric-title ${submitted && rubric.title.trim() === '' ? 'invalid' : ''}`}
                      placeholder="Rubric title, e.g. System design depth"
                      onChange={e => updateRubric(rubric.key, { title: e.target.value })} />
                    <button type="button" className="icon-btn" onClick={() => moveRubric(index, -1)} disabled={index === 0} title="Move rubric up" aria-label="Move rubric up"><MdArrowUpward /></button>
                    <button type="button" className="icon-btn" onClick={() => moveRubric(index, 1)} disabled={index === rubrics.length - 1} title="Move rubric down" aria-label="Move rubric down"><MdArrowDownward /></button>
                    <button type="button" className="icon-btn danger" onClick={() => removeRubric(rubric)} title="Remove rubric" aria-label="Remove rubric"><MdDelete /></button>
                  </div>
                  {submitted && rubric.title.trim() === '' && <span className="field-error">Every rubric needs a title</span>}
                  <textarea className="iv-textarea" value={rubric.description} maxLength={5000} aria-label={`Rubric ${index + 1} description`}
                    placeholder="Description – what does a good answer look like? What are you evaluating?"
                    onChange={e => updateRubric(rubric.key, { description: e.target.value })} />

                  {rubric.questionIds.map((id, qIndex) => {
                    const q = questionById.get(id)
                    return (
                      <div key={id} className="iv-qrow">
                        <span className="iv-qnum">{qIndex + 1}</span>
                        {q && <span className={`chip difficulty-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>}
                        <span className="iv-qrow-title" title={q?.title}>{q?.title ?? `Question #${id}`}</span>
                        {q?.category && <span className="chip">{q.category}</span>}
                        <button type="button" className="icon-btn" title="Move question up" aria-label={`Move question ${qIndex + 1} up`}
                          disabled={qIndex === 0} onClick={() => moveQuestion(rubric, qIndex, -1)}><MdArrowUpward /></button>
                        <button type="button" className="icon-btn" title="Move question down" aria-label={`Move question ${qIndex + 1} down`}
                          disabled={qIndex === rubric.questionIds.length - 1} onClick={() => moveQuestion(rubric, qIndex, 1)}><MdArrowDownward /></button>
                        <button type="button" className="icon-btn" title="Unassign" aria-label="Unassign question"
                          onClick={() => updateRubric(rubric.key, { questionIds: rubric.questionIds.filter(x => x !== id) })}><MdClose /></button>
                      </div>
                    )
                  })}
                  <button type="button" className="btn btn-secondary iv-assign" onClick={() => setPickerFor(rubric.key)} disabled={questionsError}>
                    <MdAdd /> Assign {rubric.questionIds.length ? 'more ' : ''}questions
                  </button>
                </section>
              ))}
              <button type="button" className="iv-add-rubric" onClick={() => setRubrics(prev => [...prev, blankRubric()])}>
                <MdAdd /> Add rubric
              </button>
            </div>

            <aside className="iv-card iv-summary">
              <h3>Summary</h3>
              <div className="iv-summary-row"><span>Rubrics</span><strong>{rubrics.length}</strong></div>
              <div className="iv-summary-row"><span>Questions</span><strong>{questionCount}</strong></div>
              {dirty && <span className="iv-unsaved">● Unsaved changes</span>}
              {submitted && (titleMissing || rubricTitleMissing) && (
                <div className="alert alert-error" role="alert">
                  {titleMissing ? 'The interview needs a title.' : 'Every rubric needs a title.'}
                </div>
              )}
              {saveError && <div className="alert alert-error" role="alert">{saveError}</div>}
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save interview'}</button>
              <button type="button" className="btn btn-secondary" onClick={onBack} disabled={saving}>Cancel</button>
            </aside>
          </div>
        )}
      </div>

      {rubricToRemove && (
        <ConfirmDialog
          title="Remove rubric"
          message={`Remove "${rubricToRemove.title.trim() || 'Untitled rubric'}"${rubricToRemove.questionIds.length ? ` and its ${rubricToRemove.questionIds.length} assigned ${rubricToRemove.questionIds.length === 1 ? 'question' : 'questions'}` : ''} from this interview? Nothing is deleted until you save.`}
          confirmLabel="Remove"
          busyLabel="Removing..."
          onConfirm={async () => setRubrics(prev => prev.filter(r => r.key !== rubricToRemove.key))}
          onClose={() => setRubricToRemove(null)}
        />
      )}

      {pickerRubric && (
        <QuestionPicker
          questions={questions}
          initialSelected={pickerRubric.questionIds}
          usedElsewhere={usedElsewhere}
          onClose={() => setPickerFor(null)}
          onConfirm={ids => {
            updateRubric(pickerRubric.key, { questionIds: ids })
            setPickerFor(null)
          }}
        />
      )}
    </div>
  )
}

export default InterviewEditPage
