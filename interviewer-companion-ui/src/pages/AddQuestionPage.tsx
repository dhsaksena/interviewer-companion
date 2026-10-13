import { useState, useEffect } from 'react'
import type { CategoryRecord } from '../types'
import { fetchCategories } from '../api/categoriesApi'
import PageHeader from '../components/PageHeader'
import QuestionForm, { EMPTY_QUESTION, toFormData, type QuestionFormData } from '../components/QuestionForm'
import { useToast } from '../components/Toast'

interface AddQuestionPageProps {
  onBack: () => void
  initialSubcategory?: string | null
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const AddQuestionPage = ({ onBack, initialSubcategory }: AddQuestionPageProps) => {
  const toast = useToast()
  const [categories, setCategories] = useState<CategoryRecord[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => {
        setCategories([])
        setError(err instanceof Error ? err.message : 'Failed to load categories')
      })
  }, [])

  const handleSubmit = async (data: QuestionFormData) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`${apiUrl}/questions`, { method: 'POST', body: toFormData(data) })
      if (!response.ok) throw new Error(`Could not save the question (${response.status})`)
      toast('Question added')
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question')
      setSaving(false)
    }
  }

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
      {categories === null ? (
        <div className="state-box">Loading...</div>
      ) : (
        <QuestionForm
          initial={{ ...EMPTY_QUESTION, category: parent?.name ?? '', subcategory: parent ? initialSubcategory! : '' }}
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
