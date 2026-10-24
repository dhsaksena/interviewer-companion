import { useEffect, useState } from 'react'
import '../styles/QuestionsListPage.css'
import '../styles/Interviews.css'
import '../styles/RichTextEditor.css'
import '../styles/QuestionViewPage.css'
import { MdExpandMore, MdChevronRight, MdOpenInNew, MdPrint } from 'react-icons/md'
import type { Interview, InterviewStatus } from '../types'
import PageHeader from '../components/PageHeader'
import { ConfirmDialog } from '../components/CategoryDialogs'
import DuplicateInterviewDialog from '../components/DuplicateInterviewDialog'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import { deleteInterview, fetchInterview, toInterviewInput, updateInterview } from '../api/interviewsApi'
import { API_URL, apiFetch, toImageUrl } from '../api/apiFetch'
import { STATUSES, STATUS_LABELS, formatDate } from '../utils/interviewStatus'
import { navigate, paths, useUnsavedGuard } from '../router'

interface InterviewViewPageProps {
  interviewId: number
}

interface QuestionDetail {
  description: string
  solution?: string
  solution_image_url?: string
}

type DetailState = QuestionDetail | 'loading' | 'error'

interface Evaluation {
  rating: number | null
  feedback: string
}

const evaluationsOf = (interview: Interview): Record<number, Evaluation> =>
  Object.fromEntries(interview.rubrics.map(r => [r.id, { rating: r.rating, feedback: r.feedback }]))

const InterviewViewPage = ({ interviewId }: InterviewViewPageProps) => {
  const toast = useToast()
  const [interview, setInterview] = useState<Interview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  // Edits made on this page (status + per-rubric rating/feedback), saved together
  const [status, setStatus] = useState<InterviewStatus>('draft')
  const [evals, setEvals] = useState<Record<number, Evaluation>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Questions shown inline, keyed by "rubricId:questionId" so the same question can open under two rubrics
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [details, setDetails] = useState<Record<number, DetailState>>({})

  const apply = (data: Interview) => {
    setInterview(data)
    setStatus(data.status)
    setEvals(evaluationsOf(data))
  }

  useEffect(() => {
    let cancelled = false
    fetchInterview(interviewId)
      .then(data => { if (!cancelled) apply(data) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load interview') })
    return () => { cancelled = true }
  }, [interviewId, reloadKey])

  const dirty = interview !== null && (
    status !== interview.status ||
    interview.rubrics.some(r => {
      const e = evals[r.id]
      return e && (e.rating !== r.rating || e.feedback !== r.feedback)
    })
  )
  useUnsavedGuard(dirty && !saving)

  const loadDetail = (id: number) => {
    if (details[id] && details[id] !== 'error') return
    setDetails(prev => ({ ...prev, [id]: 'loading' }))
    apiFetch(`${API_URL}/questions/${id}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch question')
        return response.json()
      })
      .then((data: QuestionDetail) => setDetails(prev => ({ ...prev, [id]: data })))
      .catch(() => setDetails(prev => ({ ...prev, [id]: 'error' })))
  }

  const toggleQuestion = (rubricId: number, questionId: number) => {
    const key = `${rubricId}:${questionId}`
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else { next.add(key); loadDetail(questionId) }
      return next
    })
  }

  const allKeys = interview?.rubrics.flatMap(r => r.questions.map(q => `${r.id}:${q.id}`)) ?? []
  const allOpen = allKeys.length > 0 && allKeys.every(k => open.has(k))
  const toggleAll = () => {
    if (allOpen) {
      setOpen(new Set())
    } else {
      setOpen(new Set(allKeys))
      interview?.rubrics.forEach(r => r.questions.forEach(q => loadDetail(q.id)))
    }
  }

  const handleSave = async () => {
    if (!interview || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const input = toInterviewInput(interview)
      input.status = status
      input.rubrics = input.rubrics.map((r, i) => {
        const e = evals[interview.rubrics[i].id]
        return e ? { ...r, rating: e.rating, feedback: e.feedback } : r
      })
      apply(await updateInterview(interview.id, input))
      toast('Evaluation saved')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await deleteInterview(interviewId)
    toast('Interview deleted')
    navigate(paths.interviews(), { force: true })
  }

  const setEval = (rubricId: number, patch: Partial<Evaluation>) =>
    setEvals(prev => ({ ...prev, [rubricId]: { ...prev[rubricId], ...patch } }))

  const meta = interview ? [
    interview.candidateName && `Candidate: ${interview.candidateName}`,
    interview.interviewDate && formatDate(interview.interviewDate),
  ].filter(Boolean).join(' · ') : ''

  const here = paths.interviewView(interviewId)

  return (
    <div className="page iv-page">
      <PageHeader
        title={interview?.title ?? 'Interview'}
        crumbs={[{ label: 'Interviews', onClick: () => navigate(paths.interviews()) }, { label: interview?.title ?? '…' }]}
        onBack={() => navigate(paths.interviews())}
        actions={interview && (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()} title="Print or save as PDF"><MdPrint /> Print</button>
            <button type="button" className="btn btn-secondary" onClick={() => setDuplicating(true)}>Duplicate</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(paths.interviewEdit(interview.id))}>Edit</button>
            <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>Delete</button>
          </>
        )}
      />

      <div className="page-body">
        {error && <ErrorBox message={error} onRetry={() => { setError(null); setReloadKey(k => k + 1) }} />}
        {!interview && !error && <LoadingState label="Loading interview" rows={4} />}

        {interview && (
          <div className="iv-view">
            <div className="iv-view-meta">
              {meta && <span className="iv-muted">{meta}</span>}
              <label className="iv-status-pick">
                <span className="sr-only">Status</span>
                <select value={status} onChange={e => setStatus(e.target.value as InterviewStatus)} className={`status-select status-${status}`}>
                  {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                </select>
              </label>
              {allKeys.length > 0 && (
                <button type="button" className="btn btn-ghost iv-no-print" onClick={toggleAll}>{allOpen ? 'Collapse all questions' : 'Expand all questions'}</button>
              )}
            </div>
            {interview.notes && <p className="iv-notes">{interview.notes}</p>}

            {interview.rubrics.length === 0 && (
              <div className="state-box">
                <p>This interview has no rubrics yet</p>
                <button type="button" className="btn btn-primary" onClick={() => navigate(paths.interviewEdit(interview.id))}>Add rubrics</button>
              </div>
            )}

            {interview.rubrics.map((rubric, index) => {
              const evaluation = evals[rubric.id] ?? { rating: rubric.rating, feedback: rubric.feedback }
              return (
                <section key={rubric.id} className="iv-card">
                  <h3><span className="iv-num">{index + 1}</span>{rubric.title}</h3>
                  {rubric.description && <p className="iv-desc">{rubric.description}</p>}

                  {rubric.questions.length === 0
                    ? <span className="iv-muted">No questions assigned</span>
                    : rubric.questions.map(q => {
                      const key = `${rubric.id}:${q.id}`
                      const isOpen = open.has(key)
                      const detail = details[q.id]
                      return (
                        <div key={q.id} className="iv-qblock">
                          <div className="iv-qrow">
                            <button type="button" className="icon-btn iv-toggle" aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${q.title}`} onClick={() => toggleQuestion(rubric.id, q.id)}>
                              {isOpen ? <MdExpandMore /> : <MdChevronRight />}
                            </button>
                            <span className={`chip difficulty-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                            <button type="button" className="title-link iv-qrow-title" title={q.title} onClick={() => toggleQuestion(rubric.id, q.id)}>{q.title}</button>
                            {q.category && <span className="chip">{q.category}</span>}
                            <button type="button" className="icon-btn iv-no-print" title="Open question page" aria-label={`Open ${q.title} on its own page`}
                              onClick={() => navigate(paths.questionView(q.id, here))}><MdOpenInNew /></button>
                          </div>
                          {isOpen && (
                            <div className="iv-qbody">
                              {detail === 'loading' || detail === undefined ? <LoadingState label="Loading question" rows={2} /> : null}
                              {detail === 'error' && <ErrorBox message="Couldn't load this question." onRetry={() => loadDetail(q.id)} />}
                              {detail && detail !== 'loading' && detail !== 'error' && (
                                <>
                                  <div className="editor-content view-content" dangerouslySetInnerHTML={{ __html: detail.description }} />
                                  {(detail.solution || detail.solution_image_url) && (
                                    <details className="iv-answer" open>
                                      <summary>Solution</summary>
                                      {detail.solution && <div className="editor-content view-content" dangerouslySetInnerHTML={{ __html: detail.solution }} />}
                                      {detail.solution_image_url && <img className="view-solution-image" src={toImageUrl(detail.solution_image_url)} alt="Solution diagram or image" />}
                                    </details>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                  <div className="iv-eval">
                    <div className="iv-rating" role="radiogroup" aria-label={`Rating for ${rubric.title}`}>
                      <span className="iv-muted">Rating</span>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} type="button" role="radio" aria-checked={evaluation.rating === n}
                          className={`iv-star ${evaluation.rating !== null && n <= evaluation.rating ? 'on' : ''}`}
                          title={`${n} out of 5`} onClick={() => setEval(rubric.id, { rating: evaluation.rating === n ? null : n })}>
                          {n}
                        </button>
                      ))}
                      {evaluation.rating !== null && <button type="button" className="breadcrumb-link iv-no-print" onClick={() => setEval(rubric.id, { rating: null })}>Clear</button>}
                    </div>
                    <textarea className="iv-textarea" value={evaluation.feedback} maxLength={5000} aria-label={`Feedback for ${rubric.title}`}
                      placeholder="Feedback: what did the candidate show on this rubric?"
                      onChange={e => setEval(rubric.id, { feedback: e.target.value })} />
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {dirty && (
        <div className="iv-savebar iv-no-print" role="region" aria-label="Unsaved evaluation">
          <span>{saveError ?? 'You have unsaved ratings, feedback or status changes.'}</span>
          <button type="button" className="btn btn-secondary" onClick={() => interview && apply(interview)} disabled={saving}>Discard</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save evaluation'}</button>
        </div>
      )}

      {confirmDelete && interview && (
        <ConfirmDialog
          title="Delete interview"
          message={`Delete "${interview.title}" and its rubrics? Your questions in the bank are not affected.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}

      {duplicating && interview && (
        <DuplicateInterviewDialog
          source={{
            id: interview.id,
            title: interview.title,
            candidateName: interview.candidateName,
            rubricCount: interview.rubrics.length,
            questionCount: interview.rubrics.reduce((n, r) => n + r.questions.length, 0),
          }}
          onClose={() => setDuplicating(false)}
          onDuplicated={copy => {
            setDuplicating(false)
            toast(copy.candidateName ? `Created interview for ${copy.candidateName}` : `Created "${copy.title}"`)
            navigate(paths.interviewView(copy.id))
          }}
        />
      )}
    </div>
  )
}

export default InterviewViewPage
