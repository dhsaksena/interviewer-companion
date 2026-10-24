import { useState, useEffect } from 'react'
import { MdDelete } from 'react-icons/md'
import type { CategoryRecord } from '../types'
import { fetchCategories } from '../api/categoriesApi'
import PageHeader from '../components/PageHeader'
import QuestionForm, { toFormData, type QuestionFormData } from '../components/QuestionForm'
import { ConfirmDialog } from '../components/CategoryDialogs'
import { useToast } from '../components/Toast'
import { API_URL, apiFetch, toImageUrl } from '../api/apiFetch'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { fetchQuestionUsage } from '../api/interviewsApi'
import { backTarget, fromLabel, navigate, paths } from '../router'
import type { InterviewUsage } from '../types'
import { usageMessage } from '../utils/usageMessage'

interface QuestionEditPageProps {
  questionId: number
  // Path the user came from, so Back returns there
  from: string | null
}

const apiUrl = API_URL

const QuestionEditPage = ({ questionId, from }: QuestionEditPageProps) => {
  const onBack = () => navigate(backTarget(from, paths.questions()))
  const toast = useToast()
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [initial, setInitial] = useState<QuestionFormData | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [usage, setUsage] = useState<InterviewUsage[]>([])
  const [reloadKey, setReloadKey] = useState(0)

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
  }, [questionId, reloadKey])

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
    navigate(paths.questions(initial?.subcategory), { force: true })
  }

  const askDelete = async () => {
    // Deleting also removes the question from interview rubrics, so say which ones
    setUsage(await fetchQuestionUsage(questionId).catch(() => []))
    setConfirmDelete(true)
  }

  return (
    <div className="page">
      <PageHeader
        title="Edit question"
        crumbs={initial ? [
          { label: fromLabel(from, initial.subcategory), onClick: onBack },
          { label: 'Edit' },
        ] : undefined}
        onBack={onBack}
        backDisabled={saving}
        actions={initial && (
          <button type="button" className="btn btn-danger-outline" onClick={askDelete} disabled={saving}>
            <MdDelete /> Delete
          </button>
        )}
      />

      {loadError && <div className="page-body"><ErrorBox message={loadError} onRetry={() => { setLoadError(null); setReloadKey(k => k + 1) }} /></div>}
      {!initial && !loadError && <div className="page-body"><LoadingState label="Loading question" rows={4} /></div>}

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
          message={usageMessage('this question', usage)}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

export default QuestionEditPage
