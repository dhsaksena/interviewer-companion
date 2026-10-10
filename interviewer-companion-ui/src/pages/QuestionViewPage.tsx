import { useState, useEffect } from 'react'
import '../styles/RichTextEditor.css'
import '../styles/QuestionViewPage.css'
import { MdArrowBack, MdEdit } from 'react-icons/md'
import ImageModal from '../components/ImageModal'

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

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const toImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${apiUrl.replace('/api', '')}${url}`

const QuestionViewPage = ({ questionId, onBack, onEdit }: QuestionViewPageProps) => {
  const [question, setQuestion] = useState<QuestionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(`${apiUrl}/questions/${questionId}`)
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
    <div className="question-view-page">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>
          <MdArrowBack /> Back
        </button>
        <h1>{question?.title ?? 'Question'}</h1>
        <button className="view-edit-btn" onClick={() => onEdit(questionId)} disabled={!question}>
          <MdEdit /> Edit
        </button>
      </div>

      {loading && <div className="view-status">Loading question...</div>}
      {error && <div className="view-error">{error}</div>}

      {question && (
        <div className="view-body">
          <div className="view-meta">
            <span className="view-chip">{question.category} › {question.subcategory}</span>
            <span className="view-chip">{question.type}</span>
            <span className={`view-chip difficulty-${question.difficulty.toLowerCase()}`}>
              {question.difficulty}
            </span>
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
        </div>
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
