import { useState, useEffect } from 'react'
import '../styles/RichTextEditor.css'
import '../styles/QuestionViewPage.css'
import { MdEdit, MdPlaylistAdd } from 'react-icons/md'
import PageHeader from '../components/PageHeader'
import ImageModal from '../components/ImageModal'
import { API_URL, apiFetch, toImageUrl } from '../api/apiFetch'
import { ErrorBox, LoadingState } from '../components/StateViews'
import AddToInterviewDialog from '../components/AddToInterviewDialog'
import { useToast } from '../components/Toast'
import { fetchQuestionUsage } from '../api/interviewsApi'
import type { InterviewUsage } from '../types'
import { backTarget, fromLabel, navigate, paths } from '../router'

interface QuestionDetails {
  title: string
  category: string
  subcategory: string
  difficulty: string
  type: string
  description: string
  solution?: string
  solution_image_url?: string
}

interface QuestionViewPageProps {
  questionId: number
  // Path the user came from (question list or an interview), so Back returns there
  from: string | null
}

const apiUrl = API_URL

const QuestionViewPage = ({ questionId, from }: QuestionViewPageProps) => {
  const toast = useToast()
  const [question, setQuestion] = useState<QuestionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [usage, setUsage] = useState<InterviewUsage[]>([])
  const [adding, setAdding] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchQuestionUsage(questionId).then(data => { if (!cancelled) setUsage(data) }).catch(() => {})

    apiFetch(`${apiUrl}/questions/${questionId}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch question')
        return response.json()
      })
      .then(data => {
        if (!cancelled) setQuestion(data)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load question')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [questionId, reloadKey])

  const backPath = backTarget(from, paths.questions(question?.subcategory))
  const onBack = () => navigate(backPath)

  const imageUrl = question?.solution_image_url ? toImageUrl(question.solution_image_url) : null

  return (
    <div className="page">
      <PageHeader
        title={question?.title ?? 'Question'}
        crumbs={question ? [{ label: fromLabel(from, question.subcategory), onClick: onBack }, { label: 'Question' }] : undefined}
        onBack={onBack}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)} disabled={!question}>
              <MdPlaylistAdd /> Add to interview
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate(paths.questionEdit(questionId, paths.questionView(questionId, from)))} disabled={!question}>
              <MdEdit /> Edit
            </button>
          </>
        }
      />

      <div className="page-body">
        <div className="view-column">
          {loading && <LoadingState label="Loading question" rows={4} />}
          {error && <ErrorBox message={error} onRetry={() => { setError(null); setLoading(true); setReloadKey(k => k + 1) }} />}

          {question && (
            <>
              <div className="view-meta">
                <span className="chip">{question.category} › {question.subcategory}</span>
                <span className="chip">{question.type}</span>
                <span className={`chip difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
              </div>

              <p className="view-usage">
                {usage.length === 0 ? 'Not used in any interview yet.' : (
                  <>
                    Used in:{' '}
                    {usage.map((u, i) => (
                      <span key={u.id}>
                        {i > 0 && ', '}
                        <button type="button" className="title-link" onClick={() => navigate(paths.interviewView(u.id))}>
                          {u.title}{u.candidateName ? ` (${u.candidateName})` : ''}
                        </button>
                      </span>
                    ))}
                  </>
                )}
              </p>

              <section className="view-section">
                <h2>Question</h2>
                <div
                  className="editor-content view-content"
                  dangerouslySetInnerHTML={{ __html: question.description }}
                />
              </section>

              <section className="view-section">
                <h2>Solution</h2>
                {question.solution ? (
                  <div
                    className="editor-content view-content"
                    dangerouslySetInnerHTML={{ __html: question.solution }}
                  />
                ) : (
                  <p className="view-empty">No solution written yet.</p>
                )}

                {imageUrl && (
                  <img
                    className="view-solution-image"
                    src={imageUrl}
                    alt="Solution diagram or image"
                    title="Click to view full screen"
                    tabIndex={0}
                    role="button"
                    onClick={() => setIsImageModalOpen(true)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsImageModalOpen(true) } }}
                  />
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {adding && (
        <AddToInterviewDialog
          questionIds={[questionId]}
          onClose={() => setAdding(false)}
          onAdded={(interview, added) => {
            setAdding(false)
            toast(added === 0 ? `Already in "${interview.title}"` : `Added to "${interview.title}"`)
            setReloadKey(k => k + 1)
          }}
        />
      )}

      <ImageModal
        isOpen={isImageModalOpen}
        imageUrl={imageUrl ?? ''}
        onClose={() => setIsImageModalOpen(false)}
      />
    </div>
  )
}

export default QuestionViewPage
