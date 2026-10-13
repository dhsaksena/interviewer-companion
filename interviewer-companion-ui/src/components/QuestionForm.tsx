import { useState, type FormEvent } from 'react'
import '../styles/QuestionForm.css'
import type { CategoryRecord } from '../types'
import RichTextEditor from './RichTextEditor'
import ImageModal from './ImageModal'
import { MdImage, MdClose } from 'react-icons/md'

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const
export const TYPES = ['Conceptual', 'Coding', 'Scenario', 'Behavioural'] as const

export interface QuestionFormData {
  title: string
  category: string
  subcategory: string
  difficulty: (typeof DIFFICULTIES)[number]
  type: (typeof TYPES)[number]
  content: string
  solution: string
  solutionImage: File | null
}

export const EMPTY_QUESTION: QuestionFormData = {
  title: '',
  category: '',
  subcategory: '',
  difficulty: 'Medium',
  type: 'Conceptual',
  content: '',
  solution: '',
  solutionImage: null,
}

export const toFormData = (data: QuestionFormData) => {
  const body = new FormData()
  body.append('title', data.title)
  body.append('category', data.category)
  body.append('subcategory', data.subcategory)
  body.append('difficulty', data.difficulty)
  body.append('type', data.type)
  body.append('description', data.content)
  body.append('solution', data.solution)
  if (data.solutionImage) body.append('solutionImage', data.solutionImage)
  return body
}

type Errors = Partial<Record<'title' | 'category' | 'subcategory' | 'content', string>>

interface SegmentedProps<T extends string> {
  label: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

const Segmented = <T extends string>({ label, options, value, onChange, disabled }: SegmentedProps<T>) => (
  <div className="field">
    <span className="field-label" id={`seg-${label}`}>{label} <span className="req">*</span></span>
    <div className="segmented" role="radiogroup" aria-labelledby={`seg-${label}`}>
      {options.map(option => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`segment ${value === option ? 'active' : ''} ${label === 'Difficulty' ? option.toLowerCase() : ''}`}
          onClick={() => onChange(option)}
          disabled={disabled}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
)

interface QuestionFormProps {
  initial: QuestionFormData
  existingImageUrl?: string | null
  categories: CategoryRecord[]
  submitLabel: string
  saving: boolean
  error?: string | null
  onSubmit: (data: QuestionFormData) => void
  onCancel: () => void
}

const QuestionForm = ({ initial, existingImageUrl, categories, submitLabel, saving, error, onSubmit, onCancel }: QuestionFormProps) => {
  const [data, setData] = useState<QuestionFormData>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [imagePreview, setImagePreview] = useState<string | null>(existingImageUrl ?? null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  const update = <K extends keyof QuestionFormData>(key: K, value: QuestionFormData[K]) => {
    setData(prev => ({ ...prev, [key]: value }))
    if (key in errors) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const subcategories = categories.find(c => c.name === data.category)?.subcategories ?? []

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    update('solutionImage', file)
    const reader = new FileReader()
    reader.onload = event => setImagePreview(event.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    update('solutionImage', null)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (!data.title.trim()) next.title = 'Enter a title for the question'
    if (!data.category) next.category = 'Choose a category'
    if (!data.subcategory) next.subcategory = 'Choose a subcategory'
    if (!data.content.replace(/<[^>]*>/g, '').trim()) next.content = 'Write the question content'
    setErrors(next)
    if (Object.keys(next).length === 0) onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="question-form" noValidate>
      <div className="form-scroll">
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <div className="form-grid">
          <section className="form-card">
            <h2 className="card-title">Details</h2>

            <div className="field">
              <label className="field-label" htmlFor="title">Title <span className="req">*</span></label>
              <input
                id="title"
                type="text"
                className={errors.title ? 'invalid' : ''}
                value={data.title}
                onChange={e => update('title', e.target.value)}
                placeholder="e.g. Explain the difference between == and ==="
                disabled={saving}
                autoFocus
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="category">Category <span className="req">*</span></label>
                <select
                  id="category"
                  className={errors.category ? 'invalid' : ''}
                  value={data.category}
                  onChange={e => {
                    update('category', e.target.value)
                    update('subcategory', '')
                  }}
                  disabled={saving}
                >
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                {errors.category && <span className="field-error">{errors.category}</span>}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="subcategory">Subcategory <span className="req">*</span></label>
                <select
                  id="subcategory"
                  className={errors.subcategory ? 'invalid' : ''}
                  value={data.subcategory}
                  onChange={e => update('subcategory', e.target.value)}
                  disabled={saving || !data.category}
                >
                  <option value="">Select a subcategory</option>
                  {subcategories.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                {errors.subcategory && <span className="field-error">{errors.subcategory}</span>}
              </div>
            </div>

            <Segmented label="Difficulty" options={DIFFICULTIES} value={data.difficulty} onChange={v => update('difficulty', v)} disabled={saving} />
            <Segmented label="Type" options={TYPES} value={data.type} onChange={v => update('type', v)} disabled={saving} />

            <div className="field">
              <span className="field-label">Question content <span className="req">*</span></span>
              <RichTextEditor
                value={data.content}
                onChange={html => update('content', html)}
                placeholder="Describe the question..."
                disabled={saving}
              />
              {errors.content && <span className="field-error">{errors.content}</span>}
            </div>
          </section>

          <section className="form-card">
            <h2 className="card-title">Solution</h2>

            <div className="field">
              <span className="field-label">Answer</span>
              <RichTextEditor
                value={data.solution}
                onChange={html => update('solution', html)}
                placeholder="Write the solution here..."
                disabled={saving}
              />
            </div>

            <div className="field">
              <span className="field-label">Solution image</span>
              {imagePreview ? (
                <div className="image-preview">
                  <img
                    src={imagePreview}
                    alt="Solution preview"
                    onClick={() => setIsImageModalOpen(true)}
                    title="Click to view full screen"
                  />
                  <button type="button" className="btn btn-secondary remove-image" onClick={removeImage} disabled={saving}>
                    <MdClose /> Remove
                  </button>
                </div>
              ) : (
                <label className="image-drop" htmlFor="solutionImage">
                  <MdImage />
                  <span>Click to upload an image</span>
                </label>
              )}
              <input
                id="solutionImage"
                type="file"
                accept="image/*"
                className="file-input"
                onChange={handleImageChange}
                disabled={saving}
              />
            </div>
          </section>
        </div>
      </div>

      <div className="form-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>

      <ImageModal isOpen={isImageModalOpen} imageUrl={imagePreview || ''} onClose={() => setIsImageModalOpen(false)} />
    </form>
  )
}

export default QuestionForm
