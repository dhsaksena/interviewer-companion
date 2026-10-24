import { useEffect, useState } from 'react'
import '../styles/HomePage.css'
import { MdFolderOpen, MdAdd } from 'react-icons/md'
import type { CategoryRecord, InterviewSummary } from '../types'
import { fetchCategories } from '../api/categoriesApi'
import { fetchInterviews } from '../api/interviewsApi'
import { ErrorBox, LoadingState } from '../components/StateViews'
import StatusChip from '../components/StatusChip'
import { formatRelative } from '../utils/formatRelative'
import { navigate, paths } from '../router'

const HomePage = () => {
  const [categories, setCategories] = useState<CategoryRecord[] | null>(null)
  const [recent, setRecent] = useState<InterviewSummary[] | null>(null)
  const [totalInterviews, setTotalInterviews] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(err => {
      setCategories([])
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    })
    fetchInterviews({ q: '', sort: 'updated', dir: 'desc', page: 1, pageSize: 5, questions: 'all', status: 'all' })
      .then(result => { setRecent(result.items); setTotalInterviews(result.total) })
      .catch(() => setRecent([]))
  }, [reloadKey])

  const questionTotal = categories?.reduce((n, c) => n + c.subcategories.reduce((m, s) => m + (s.question_count ?? 0), 0), 0) ?? 0
  const hasSubcategories = categories?.some(c => c.subcategories.length > 0) ?? false
  const loaded = categories !== null && recent !== null
  const steps = [
    { done: hasSubcategories, label: 'Create a category and subcategory', hint: 'Use "+ Add Category" in the sidebar, then the + beside it for subcategories.' },
    { done: questionTotal > 0, label: 'Add your first question', hint: 'Open a topic and press New question.', action: hasSubcategories ? { label: 'New question', go: () => navigate(paths.questionNew()) } : undefined },
    { done: totalInterviews > 0, label: 'Plan an interview with rubrics', hint: 'Group questions under rubrics for each candidate.', action: { label: 'New interview', go: () => navigate(paths.interviewNew()) } },
  ]
  const onboarding = loaded && steps.some(step => !step.done)

  return (
    <div className="page">
      <div className="page-body">
        <div className="home-column">
          <h1 className="home-title">Saarthi</h1>
          <p className="home-subtitle">Plan interviews, keep your question bank organised, and capture feedback as you go.</p>

          <div className="home-actions">
            <button type="button" className="btn btn-primary" onClick={() => navigate(paths.interviewNew())}><MdAdd /> New interview</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(paths.questionNew())} disabled={!hasSubcategories}><MdAdd /> New question</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(paths.questions())}>Browse all questions</button>
          </div>

          {error && <ErrorBox message={error} onRetry={() => { setError(null); setReloadKey(k => k + 1) }} />}
          {!loaded && <LoadingState label="Loading" rows={3} />}

          {onboarding && (
            <section className="home-card home-wide" aria-label="Getting started">
              <h2>Getting started</h2>
              <ol className="home-steps">
                {steps.map(step => (
                  <li key={step.label} className={step.done ? 'done' : undefined}>
                    <span className="home-step-mark" aria-hidden="true">{step.done ? '✓' : ''}</span>
                    <div>
                      <strong>{step.label}</strong>
                      {!step.done && <p>{step.hint}</p>}
                    </div>
                    {!step.done && step.action && (
                      <button type="button" className="btn btn-secondary" onClick={step.action.go}>{step.action.label}</button>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {recent && recent.length > 0 && (
            <section className="home-card home-wide" aria-label="Recent interviews">
              <div className="home-card-head">
                <h2>Recent interviews</h2>
                <button type="button" className="breadcrumb-link" onClick={() => navigate(paths.interviews())}>View all ({totalInterviews})</button>
              </div>
              <ul className="home-recent">
                {recent.map(item => (
                  <li key={item.id}>
                    <button type="button" className="title-link" onClick={() => navigate(paths.interviewView(item.id))}>{item.title}</button>
                    <span className="iv-muted">{item.candidateName || 'No candidate'}</span>
                    <StatusChip status={item.status} />
                    <span className="iv-muted">{formatRelative(item.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {categories?.length === 0 && !error && (
            <div className="state-box">
              <MdFolderOpen className="state-icon" />
              <p className="state-title">No categories yet</p>
              <p>Create one with “+ Add Category” in the sidebar.</p>
            </div>
          )}

          <div className="home-grid">
            {categories?.map(category => (
              <section key={category.id} className="home-card">
                <h2>{category.name}</h2>
                {category.subcategories.length === 0 ? (
                  <p className="home-empty">No subcategories</p>
                ) : (
                  <div className="home-chips">
                    {category.subcategories.map(sub => (
                      <button key={sub.id} type="button" className="topic-chip" onClick={() => navigate(paths.questions(sub.name))}>
                        {sub.name} <span className="topic-count">{sub.question_count ?? 0}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
