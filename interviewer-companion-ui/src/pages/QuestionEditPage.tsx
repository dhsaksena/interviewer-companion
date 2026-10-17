import { useState, useEffect } from 'react'
import { MdDelete } from 'react-icons/md'
import type { CategoryRecord } from '../types'
import { fetchCategories } from '../api/categoriesApi'
import PageHeader from '../components/PageHeader'
import QuestionForm, { toFormData, type QuestionFormData } from '../components/QuestionForm'
import { ConfirmDialog } from '../components/CategoryDialogs'
import { useToast } from '../components/Toast'
import { API_URL, apiFetch } from '../api/apiFetch'

interface QuestionEditPageProps {
  questionId: number
  onBack: () => void
}

const apiUrl = API_URL

const toImageUrl = (url: string) =>
  url.startsWith('http') ? url : `${apiUrl.replace('/api', '')}${url}`

const QuestionEditPage = ({ questionId, onBack }: QuestionEditPageProps) => {
  const toast = useToast()
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [initial, setInitial] = useState<QuestionFormData | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchCategories(),
      apiFetch(`${apiUrl}/questions/${questionId}`).then(res => {
        if (!res.ok) throw new Error('Failed to fetch question')
        return res.json()
      }),
    ])
      .then(([cats, q]) => {
        if (cancelled) return
        setCategories(cats)
        setInitial({
          title: q.title,
          category: q.category,
          subcategory: q.subcategory,
          difficulty: q.difficulty,
          type: q.type,
          content: q.description,
          solution: q.solution || '',
          solutionImage: null,
        })
        if (q.solution_image_url) setImageUrl(toImageUrl(q.solution_image_url))
      })
      .catch(err => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load question')
      })
    return () => { cancelled = true }
  }, [questionId])

  const handleSubmit = async (data: QuestionFormData) => {
    setSaving(true)
    setError(null)
    try {
      const response = await apiFetch(`${apiUrl}/questions/${questionId}`, { method: 'PUT', body: toFormData(data) })
      if (!response.ok) throw new Error(`Could not save changes (${response.status})`)
      toast('Changes saved')
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const response = await apiFetch(`${apiUrl}/questions/${questionId}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete question')
    toast('Question deleted')
    onBack()
  }

  return (
    <div className="page">
      <PageHeader
        title="Edit question"
        crumbs={initial ? [
          { label: initial.subcategory, onClick: onBack },
          { label: 'Edit' },
        ] : undefined}
        onBack={onBack}
        backDisabled={saving}
        actions={initial && (
          <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)} disabled={saving}>
            <MdDelete /> Delete
          </button>
        )}
      />

      {loadError && <div className="page-body"><div className="alert alert-error">{loadError}</div></div>}
      {!initial && !loadError && <div className="state-box">Loading...</div>}

      {initial && (
        <QuestionForm
          initial={initial}
          existingImageUrl={imageUrl}
          categories={categories}
          submitLabel="Save changes"
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
          onCancel={onBack}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete question"
          message="Delete this question? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

export default QuestionEditPage
