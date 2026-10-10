import { useState, useEffect } from 'react'
import '../styles/AddQuestionPage.css'
import type { Category } from '../types'
import { MdArrowBack, MdDelete } from 'react-icons/md'
import RichTextEditor from '../components/RichTextEditor'
import ImageModal from '../components/ImageModal'

interface FormData {
  title: string
  category: string
  subcategory: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  type: 'Conceptual' | 'Coding' | 'Scenario' | 'Behavioural'
  content: string
  solution: string
  solutionImage: File | null
}

interface QuestionEditPageProps {
  questionId: number
  onBack: () => void
}

const QuestionEditPage = ({ questionId, onBack }: QuestionEditPageProps) => {
  const [categories, setCategories] = useState<Record<string, Category>>({})
  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: '',
    subcategory: '',
    difficulty: 'Medium',
    type: 'Conceptual',
    content: '',
    solution: '',
    solutionImage: null
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isNewImage, setIsNewImage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  useEffect(() => {
    fetchCategoriesAndQuestion()
  }, [questionId])

  const fetchCategoriesAndQuestion = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

      // Fetch categories
      const categoriesResponse = await fetch(`${apiUrl}/categories`)
      if (!categoriesResponse.ok) throw new Error('Failed to fetch categories')
      const categoriesData = await categoriesResponse.json()

      const categoriesMap: Record<string, Category> = {}
      categoriesData.forEach((cat: any) => {
        categoriesMap[cat.name] = {
          name: cat.name,
          expanded: true,
          subcategories: cat.subcategories.map((sub: any) => sub.name)
        }
      })
      setCategories(categoriesMap)

      // Fetch question
      const questionResponse = await fetch(`${apiUrl}/questions/${questionId}`)
      if (!questionResponse.ok) throw new Error('Failed to fetch question')
      const question = await questionResponse.json()

      console.log('Question loaded from API:', {
        title: question.title,
        solutionLength: question.solution?.length || 0,
        solutionPreview: question.solution?.substring(0, 50)
      })

      setFormData({
        title: question.title,
        category: question.category,
        subcategory: question.subcategory,
        difficulty: question.difficulty,
        type: question.type,
        content: question.description,
        solution: question.solution || '',
        solutionImage: null
      })

      if (question.solution_image_url) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
        const baseUrl = apiUrl.replace('/api', '')
        const fullImageUrl = question.solution_image_url.startsWith('http')
          ? question.solution_image_url
          : `${baseUrl}${question.solution_image_url}`
        setImagePreview(fullImageUrl)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question')
      console.error('Error:', err)
    } finally {
      setLoading(false)
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
      subcategory: ''
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        solutionImage: file
      }))
      setIsNewImage(true)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('=== SAVE CHANGES CLICKED ===')
    console.log('Current form data:', {
      title: formData.title,
      category: formData.category,
      subcategory: formData.subcategory,
      contentLength: formData.content.length,
      solutionLength: formData.solution.length
    })

    if (!formData.title.trim()) {
      setError('Question title is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('category', formData.category)
      formDataToSend.append('subcategory', formData.subcategory)
      formDataToSend.append('difficulty', formData.difficulty)
      formDataToSend.append('type', formData.type)
      formDataToSend.append('description', formData.content)
      formDataToSend.append('solution', formData.solution)
      if (formData.solutionImage) {
        formDataToSend.append('solutionImage', formData.solutionImage)
      }

      console.log('Sending PUT request to:', `${apiUrl}/questions/${questionId}`)

      const response = await fetch(`${apiUrl}/questions/${questionId}`, {
        method: 'PUT',
        body: formDataToSend
      })

      console.log('Response status:', response.status)
      const responseText = await response.text()
      console.log('Response:', responseText)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${responseText}`)
      }

      console.log('Update successful!')
      setSuccess(true)
      setTimeout(() => {
        onBack()
      }, 1000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update question'
      console.error('Error:', errorMessage)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this question? This cannot be undone.')) return

    try {
      setSaving(true)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

      const response = await fetch(`${apiUrl}/questions/${questionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete question')
      }

      alert('Question deleted successfully')
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
  }

  const selectedCategory = formData.category ? categories[formData.category] : null

  return (
    <div className="add-question-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack} disabled={saving}>
          <MdArrowBack /> Back
        </button>
        <h1>Edit Question</h1>
        <button
          className="delete-question-btn"
          onClick={handleDelete}
          disabled={saving}
          title="Delete this question"
        >
          <MdDelete /> Delete
        </button>
      </div>

      <form onSubmit={handleSubmit} className="question-form-container">
        <div className="form-grid">
          <div className="form-column">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">Question updated successfully!</div>}

            <div className="form-group">
              <label htmlFor="title">Question Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter the question title"
                disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving || !selectedCategory}
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
                        disabled={saving}
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
                        disabled={saving}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="content">Question Content *</label>
              <RichTextEditor
                value={formData.content}
                onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                placeholder="Enter question content..."
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-column">
            <div className="form-group full-width">
              <label htmlFor="solution">Solution</label>
              <RichTextEditor
                value={formData.solution}
                onChange={(html) => setFormData(prev => ({ ...prev, solution: html }))}
                placeholder="Write the solution here..."
                disabled={saving}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="solutionImage">Solution Image</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  id="solutionImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={saving}
                  className="file-input"
                />
                <label htmlFor="solutionImage" className="upload-label">
                  {isNewImage ? 'Image selected ✓' : 'Click to upload image'}
                </label>
              </div>

              {imagePreview && (
                <div className="image-preview">
                  <img
                    src={imagePreview}
                    alt="Solution preview"
                    onClick={() => setIsImageModalOpen(true)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full screen"
                  />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => {
                      setImagePreview(null)
                      setFormData(prev => ({ ...prev, solutionImage: null }))
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-footer">
          <button type="button" className="btn-cancel" onClick={onBack} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <ImageModal
        isOpen={isImageModalOpen}
        imageUrl={imagePreview || ''}
        onClose={() => setIsImageModalOpen(false)}
      />
    </div>
  )
}

export default QuestionEditPage
