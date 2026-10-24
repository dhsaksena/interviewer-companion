import { useState, useEffect } from 'react'
import type { CategoryRecord } from '../types'
import { fetchCategories } from '../api/categoriesApi'
import PageHeader from '../components/PageHeader'
import QuestionForm, { EMPTY_QUESTION, toFormData, type QuestionFormData } from '../components/QuestionForm'
import { useToast } from '../components/Toast'
import { API_URL, apiFetch } from '../api/apiFetch'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { navigate, paths } from '../router'

interface AddQuestionPageProps {
  initialSubcategory?: string | null
}

const apiUrl = API_URL

const AddQuestionPage = ({ initialSubcategory }: AddQuestionPageProps) => {
  const onBack = () => navigate(paths.questions(initialSubcategory))
  const toast = useToast()
  const [categories, setCategories] = useState<CategoryRecord[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Bumping this remounts the form blank for "Save & add another"
  const [formKey, setFormKey] = useState(0)
  // Category/subcategory of the last saved question, kept for the next one
  const [lastTopic, setLastTopic] = useState<{ category: string; subcategory: string } | null>(null)

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load categories'))
  }, [reloadKey])

  const save = async (data: QuestionFormData, addAnother: boolean) => {
    setSaving(true)
    setError(null)
    try {
      const response = await apiFetch(`${apiUrl}/questions`, { method: 'POST', body: toFormData(data) })
      if (!response.ok) throw new Error(`Could not save the question (${response.status})`)
      toast('Question added')
      if (addAnother) {
        setLastTopic({ category: data.category, subcategory: data.subcategory })
        setFormKey(k => k + 1)
        setSaving(false)
      } else {
        onBack()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question')
      setSaving(false)
    }
  }

  const handleSubmit = (data: QuestionFormData) => save(data, false)

  const parent = initialSubcategory
    ? categories?.find(c => c.subcategories.some(s => s.name === initialSubcategory))
    : undefined

  return (
    <div className="page">
      <PageHeader
        title="Add question"
        crumbs={[
          ...(initialSubcategory ? [{ label: initialSubcategory, onClick: onBack }] : []),
          { label: 'New question' },
        ]}
        onBack={onBack}
        backDisabled={saving}
      />
      {loadError ? (
        <div className="page-body"><ErrorBox message={loadError} onRetry={() => { setLoadError(null); setReloadKey(k => k + 1) }} /></div>
      ) : categories === null ? (
        <div className="page-body"><LoadingState label="Loading categories" rows={3} /></div>
      ) : (
        <QuestionForm
          key={formKey}
          draftKey="draft:new-question"
          secondarySubmit={{ label: 'Save & add another', onSubmit: data => save(data, true) }}
          initial={{
            ...EMPTY_QUESTION,
            category: lastTopic?.category ?? parent?.name ?? '',
            subcategory: lastTopic?.subcategory ?? (parent ? initialSubcategory! : ''),
          }}
          categories={categories}
          submitLabel="Save question"
          saving={saving}
          error={error}
          onSubmit={handleSubmit}
          onCancel={onBack}
        />
      )}
    </div>
  )
}

export default AddQuestionPage
