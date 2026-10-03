import { useState, useEffect } from 'react'
import '../styles/AddQuestionPage.css'
import type { Category } from '../types'
import { MdArrowBack } from 'react-icons/md'
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

interface AddQuestionPageProps {
  onBack: () => void
}

const AddQuestionPage = ({ onBack }: AddQuestionPageProps) => {
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

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
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('=== FORM SUBMIT CLICKED ===', formData)

    console.log('Validating title:', formData.title)
    if (!formData.title.trim()) {
      console.log('Title validation failed')
      setError('Question title is required')
      return
    }
    console.log('Title OK, validating category:', formData.category)
    if (!formData.category) {
      console.log('Category validation failed')
      setError('Category is required')
      return
    }
    console.log('Category OK, validating subcategory:', formData.subcategory)
    if (!formData.subcategory) {
      console.log('Subcategory validation failed')
      setError('Subcategory is required')
      return
    }
    console.log('Subcategory OK, validating content')
    const textContent = formData.content.replace(/<[^>]*>/g, '').trim()
    console.log('Text content:', textContent.substring(0, 50))
    if (!textContent) {
      console.log('Content validation failed')
      setError('Question content is required')
      return
    }
    console.log('All validations passed, proceeding with submit')

    setLoading(true)
    setError(null)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      console.log('Submitting to API:', apiUrl)

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

      console.log('Form data prepared, sending request...')

      const response = await fetch(`${apiUrl}/questions`, {
        method: 'POST',
        body: formDataToSend
      })

      console.log('Response status:', response.status)
      const responseText = await response.text()
      console.log('Response:', responseText)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${responseText}`)
      }

      console.log('Question created successfully')
      setSuccess(true)
      setTimeout(() => {
        onBack()
      }, 1500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create question'
      console.error('Error:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = formData.category ? categories[formData.category] : null

  return (
    <div className="add-question-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack} disabled={loading}>
          <MdArrowBack /> Back
        </button>
        <h1>Add New Question</h1>
      </div>

      <form onSubmit={handleSubmit} className="question-form-container">
        <div className="form-grid">
          {/* Left Column */}
          <div className="form-column">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">Question saved successfully!</div>}

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

            <div className="form-group full-width">
              <label htmlFor="content">Question Content *</label>
              <RichTextEditor
                value={formData.content}
                onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                placeholder="Enter question content..."
                disabled={loading}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="form-column">
            <div className="form-group full-width">
              <label htmlFor="solution">Solution</label>
              <RichTextEditor
                value={formData.solution}
                onChange={(html) => setFormData(prev => ({ ...prev, solution: html }))}
                placeholder="Write the solution here..."
                disabled={loading}
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
                  disabled={loading}
                  className="file-input"
                />
                <label htmlFor="solutionImage" className="upload-label">
                  {imagePreview ? 'Image selected ✓' : 'Click to upload image'}
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
          <button type="button" className="btn-cancel" onClick={onBack} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Question'}
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

export default AddQuestionPage
