import { useState, useEffect } from 'react'
import '../styles/QuestionsListPage.css'
import { MdArrowBack, MdEdit, MdDelete } from 'react-icons/md'
import type { Question } from '../types'

interface QuestionsListPageProps {
  selectedSubcategory: string
  onBack: () => void
  onSelectQuestion: (questionId: string) => void
}

const QuestionsListPage = ({ selectedSubcategory, onBack, onSelectQuestion }: QuestionsListPageProps) => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuestions()
  }, [selectedSubcategory])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${apiUrl}/questions?subcategory=${encodeURIComponent(selectedSubcategory)}`)

      if (!response.ok) throw new Error('Failed to fetch questions')

      const data = await response.json()
      setQuestions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questions')
      console.error('Error fetching questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${apiUrl}/questions/${questionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete question')

      setQuestions(questions.filter(q => q.id !== questionId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete question')
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#4CAF50'
      case 'Medium': return '#FF9800'
      case 'Hard': return '#F44336'
      default: return '#999'
    }
  }

  return (
    <div className="questions-list-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          <MdArrowBack /> Back
        </button>
        <h1>Questions for {selectedSubcategory}</h1>
        <span className="count">{questions.length} questions</span>
      </div>

      {loading && <div className="loading">Loading questions...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <div className="table-container">
          {questions.length === 0 ? (
            <div className="empty-state">
              <p>No questions yet for {selectedSubcategory}</p>
              <p>Create one to get started!</p>
            </div>
          ) : (
            <table className="questions-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map(question => (
                  <tr key={question.id}>
                    <td className="title-cell">{question.title}</td>
                    <td className="type-cell">{question.type}</td>
                    <td className="difficulty-cell">
                      <span
                        className="difficulty-badge"
                        style={{ backgroundColor: getDifficultyColor(question.difficulty) }}
                      >
                        {question.difficulty}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => onSelectQuestion(question.id)}
                        title="Edit question"
                      >
                        <MdEdit /> Edit
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(question.id)}
                        title="Delete question"
                      >
                        <MdDelete /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestionsListPage
