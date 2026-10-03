import { useState, useEffect } from 'react'
import './AddQuestionModal.css'
import type { Category } from '../types'

interface AddQuestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface FormData {
  title: string
  category: string
  subcategory: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  type: 'Conceptual' | 'Coding' | 'Scenario' | 'Behavioural'
  content: string
}

const AddQuestionModal = ({ isOpen, onClose, onSuccess }: AddQuestionModalProps) => {
  const [categories, setCategories] = useState<Record<string, Category>>({})
  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: '',
    subcategory: '',
    difficulty: 'Medium',
    type: 'Conceptual',
    content: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  const fetchCategories = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/categories`)
      if (!response.ok) throw new Error('Failed to fetch categories')

      const data = await response.json()
      const categoriesMap: Record<string, Category> = {}
      data.forEach((cat: any) => {
        categoriesMap[cat.name] = {
          name: cat.name,
          expanded: true,
          subcategories: cat.subcategories.map((sub: any) => sub.name)
        }
      })
      setCategories(categoriesMap)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value
    setFormData(prev => ({
      ...prev,
      category,
      subcategory: '' // Reset subcategory when category changes
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      setError('Question title is required')
      return
    }
    if (!formData.category) {
      setError('Category is required')
      return
    }
    if (!formData.subcategory) {
      setError('Subcategory is required')
      return
    }
    if (!formData.content.trim()) {
      setError('Question content is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          subcategory: formData.subcategory,
          difficulty: formData.difficulty,
          type: formData.type,
          content: formData.content
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create question')
      }

      // Reset form and close modal
      setFormData({
        title: '',
        category: '',
        subcategory: '',
        difficulty: 'Medium',
        type: 'Conceptual',
        content: ''
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const selectedCategory = formData.category ? categories[formData.category] : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Question</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="question-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="title">Question Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter the question title"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                disabled={loading}
              >
                <option value="">Select a category</option>
                {Object.keys(categories).map(catName => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="subcategory">Subcategory *</label>
              <select
                id="subcategory"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                disabled={loading || !selectedCategory}
              >
                <option value="">Select a subcategory</option>
                {selectedCategory?.subcategories.map(subcat => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Difficulty *</label>
              <div className="radio-group">
                {(['Easy', 'Medium', 'Hard'] as const).map(level => (
                  <label key={level} className="radio-label">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={formData.difficulty === level}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Question Type *</label>
              <div className="radio-group">
                {(['Conceptual', 'Coding', 'Scenario', 'Behavioural'] as const).map(t => (
                  <label key={t} className="radio-label">
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={formData.type === t}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="content">Question Content *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Enter the question content"
              rows={6}
              disabled={loading}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddQuestionModal
