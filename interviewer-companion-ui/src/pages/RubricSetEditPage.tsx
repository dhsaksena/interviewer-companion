import { useEffect, useState } from 'react'
import '../styles/QuestionForm.css'
import '../styles/Interviews.css'
import { MdArrowUpward, MdArrowDownward, MdDelete, MdAdd } from 'react-icons/md'
import type { RubricSet, RubricSetInterviewRef } from '../types'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import { createRubricSet, fetchRubricSet, fetchRubricSetInterviews, updateRubricSet } from '../api/rubricSetsApi'
import { formatDate } from '../utils/interviewStatus'
import { navigate, paths, useUnsavedGuard } from '../router'

interface Draft { key: number; title: string; description: string }

let keyCounter = 0
const blank = (): Draft => ({ key: keyCounter++, title: '', description: '' })

const snapshotOf = (name: string, role: string, description: string, items: Draft[]) =>
  JSON.stringify({ name, role, description, items: items.map(i => [i.title, i.description]) })

const RubricSetEditPage = ({ rubricSetId }: { rubricSetId: number | null }) => {
  const toast = useToast()
  const onBack = () => navigate(paths.rubricSets())

  const [loading, setLoading] = useState(rubricSetId !== null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<Draft[]>(() => (rubricSetId === null ? [blank()] : []))
  const [baseline, setBaseline] = useState<string | null>(rubricSetId === null ? snapshotOf('', '', '', [{ key: -1, title: '', description: '' }]) : null)
  const [usage, setUsage] = useState<{ set: RubricSet; interviews: RubricSetInterviewRef[] } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (rubricSetId === null) return
    let cancelled = false
    Promise.all([fetchRubricSet(rubricSetId), fetchRubricSetInterviews(rubricSetId)])
      .then(([set, interviews]) => {
        if (cancelled) return
        const drafts = set.items.map(i => ({ key: keyCounter++, title: i.title, description: i.description }))
        setName(set.name)
        setRole(set.role)
        setDescription(set.description)
        setItems(drafts)
        setUsage({ set, interviews })
        setBaseline(snapshotOf(set.name, set.role, set.description, drafts))
      })
      .catch(err => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load rubric set') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [rubricSetId, reloadKey])

  const dirty = baseline !== null && snapshotOf(name, role, description, items) !== baseline
  useUnsavedGuard(dirty && !saving)

  const update = (key: number, patch: Partial<Draft>) => setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)))
  const move = (index: number, delta: number) =>
    setItems(prev => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const nameMissing = name.trim() === ''
  const titleMissing = items.some(i => i.title.trim() === '')
  const noItems = items.length === 0

  const handleSave = async () => {
    setSubmitted(true)
    if (nameMissing || titleMissing || noItems || saving) return
    setSaving(true)
    setSaveError(null)
    const input = {
      name: name.trim(),
      role: role.trim(),
      description: description.trim(),
      items: items.map(i => ({ title: i.title.trim(), description: i.description.trim() })),
    }
    try {
      if (rubricSetId === null) await createRubricSet(input)
      else await updateRubricSet(rubricSetId, input)
      toast('Rubric set saved')
      navigate(paths.rubricSets(), { force: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save rubric set')
      setSaving(false)
    }
  }

  const heading = rubricSetId === null ? 'New rubric set' : 'Edit rubric set'

  return (
    <div className="page">
      <PageHeader
        title={heading}
        crumbs={[{ label: 'Rubric Sets', onClick: onBack }, { label: heading }]}
        onBack={onBack}
        backDisabled={saving}
      />

      <div className="page-body">
        {loading && <LoadingState label="Loading rubric set" rows={4} />}
        {loadError && <ErrorBox message={loadError} onRetry={() => { setLoadError(null); setLoading(true); setReloadKey(k => k + 1) }} />}

        {!loading && !loadError && (
          <div className="iv-edit">
            <div className="iv-edit-main">
              <section className="iv-card">
                <div className="iv-fields">
                  <div className="field">
                    <label className="field-label" htmlFor="rs-name">Name <span className="req">*</span></label>
                    <input id="rs-name" type="text" value={name} maxLength={255} onChange={e => setName(e.target.value)}
                      className={submitted && nameMissing ? 'invalid' : undefined} placeholder="e.g. Senior Backend Engineer" autoFocus={rubricSetId === null} />
                    {submitted && nameMissing && <span className="field-error">Give the rubric set a name</span>}
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="rs-role">Role</label>
                    <input id="rs-role" type="text" value={role} maxLength={255} onChange={e => setRole(e.target.value)} placeholder="e.g. Backend Engineer" />
                  </div>
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label className="field-label" htmlFor="rs-desc">Description</label>
                  <textarea id="rs-desc" className="iv-textarea" value={description} maxLength={5000} onChange={e => setDescription(e.target.value)} placeholder="When to use this set…" />
                </div>
              </section>

              <h2 className="iv-section-title">Rubrics</h2>
              {items.map((item, index) => (
                <section key={item.key} className="iv-card">
                  <div className="iv-rubric-head">
                    <span className="iv-num">{index + 1}</span>
                    <input type="text" value={item.title} maxLength={255} aria-label={`Rubric ${index + 1} title`}
                      className={`iv-rubric-title ${submitted && item.title.trim() === '' ? 'invalid' : ''}`}
                      placeholder="Rubric title, e.g. System design depth" onChange={e => update(item.key, { title: e.target.value })} />
                    <button type="button" className="icon-btn" onClick={() => move(index, -1)} disabled={index === 0} title="Move up" aria-label="Move rubric up"><MdArrowUpward /></button>
                    <button type="button" className="icon-btn" onClick={() => move(index, 1)} disabled={index === items.length - 1} title="Move down" aria-label="Move rubric down"><MdArrowDownward /></button>
                    <button type="button" className="icon-btn danger" onClick={() => setItems(prev => prev.filter(i => i.key !== item.key))} title="Remove rubric" aria-label="Remove rubric"><MdDelete /></button>
                  </div>
                  {submitted && item.title.trim() === '' && <span className="field-error">Every rubric needs a title</span>}
                  <textarea className="iv-textarea" value={item.description} maxLength={5000} aria-label={`Rubric ${index + 1} description`}
                    placeholder="Description – what does a good answer look like? What are you evaluating?"
                    onChange={e => update(item.key, { description: e.target.value })} />
                </section>
              ))}
              {submitted && noItems && <span className="field-error">Add at least one rubric</span>}
              <button type="button" className="iv-add-rubric" onClick={() => setItems(prev => [...prev, blank()])}><MdAdd /> Add rubric</button>
            </div>

            <aside className="iv-card iv-summary">
              <h3>Summary</h3>
              <div className="iv-summary-row"><span>Rubrics</span><strong>{items.length}</strong></div>
              {usage && (
                <>
                  <div className="iv-summary-row"><span>Interviews</span><strong>{usage.set.interviewCount}</strong></div>
                  <div className="iv-summary-row"><span>Completed</span><strong>{usage.set.completedInterviewCount}</strong></div>
                </>
              )}
              {usage && usage.interviews.length > 0 && (
                <div className="rs-usage">
                  <h3>Interviews using this set</h3>
                  {usage.interviews.map(iv => (
                    <button type="button" key={iv.id} className="rs-usage-row" onClick={() => navigate(paths.interviewView(iv.id))}>
                      <span className="rs-usage-title">{iv.title}</span>
                      <span className="iv-muted">{iv.candidateName || 'No candidate'}{iv.interviewDate ? ` · ${formatDate(iv.interviewDate)}` : ''}</span>
                      <StatusChip status={iv.status} />
                    </button>
                  ))}
                </div>
              )}
              {rubricSetId !== null && <p className="iv-muted">Changes here don't affect interviews that already used this set.</p>}
              {dirty && <span className="iv-unsaved">● Unsaved changes</span>}
              {submitted && (nameMissing || titleMissing || noItems) && (
                <div className="alert alert-error" role="alert">
                  {nameMissing ? 'The set needs a name.' : noItems ? 'Add at least one rubric.' : 'Every rubric needs a title.'}
                </div>
              )}
              {saveError && <div className="alert alert-error" role="alert">{saveError}</div>}
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save rubric set'}</button>
              <button type="button" className="btn btn-secondary" onClick={onBack} disabled={saving}>Cancel</button>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

export default RubricSetEditPage
