import { useState, useEffect } from 'react'
import '../styles/RichTextEditor.css'
import '../styles/QuestionViewPage.css'
import { MdEdit } from 'react-icons/md'
import PageHeader from '../components/PageHeader'
import ImageModal from '../components/ImageModal'
import { API_URL, apiFetch, toImageUrl } from '../api/apiFetch'

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
  onBack: () => void
  onEdit: (questionId: number) => void
}

const apiUrl = API_URL

const QuestionViewPage = ({ questionId, onBack, onEdit }: QuestionViewPageProps) => {
  const [question, setQuestion] = useState<QuestionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

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
  }, [questionId])

  const imageUrl = question?.solution_image_url ? toImageUrl(question.solution_image_url) : null

  return (
    <div className="page">
      <PageHeader
        title={question?.title ?? 'Question'}
        crumbs={question ? [{ label: question.subcategory, onClick: onBack }, { label: 'Question' }] : undefined}
        onBack={onBack}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => onEdit(questionId)} disabled={!question}>
            <MdEdit /> Edit
          </button>
        }
      />

      <div className="page-body">
        <div className="view-column">
          {loading && <div className="state-box">Loading question...</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {question && (
            <>
              <div className="view-meta">
                <span className="chip">{question.category} › {question.subcategory}</span>
                <span className="chip">{question.type}</span>
                <span className={`chip difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
              </div>

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
                    alt="Solution"
                    title="Click to view full screen"
                    onClick={() => setIsImageModalOpen(true)}
                  />
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <ImageModal
        isOpen={isImageModalOpen}
        imageUrl={imageUrl ?? ''}
        onClose={() => setIsImageModalOpen(false)}
      />
    </div>
  )
}

export default QuestionViewPage
