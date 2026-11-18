import { useEffect, useState } from 'react'
import '../styles/QuestionsListPage.css'
import '../styles/Interviews.css'
import { MdAdd, MdSearch, MdInbox, MdEdit, MdContentCopy, MdDelete } from 'react-icons/md'
import type { RubricSetSummary } from '../types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { ConfirmDialog } from '../components/CategoryDialogs'
import { ErrorBox, LoadingState } from '../components/StateViews'
import { useToast } from '../components/Toast'
import { deleteRubricSet, duplicateRubricSet, fetchRubricSets } from '../api/rubricSetsApi'
import { formatRelative } from '../utils/formatRelative'
import { navigate, paths } from '../router'

const usageText = (set: RubricSetSummary) => {
  if (set.interviewCount === 0) return 'Not used yet'
  const used = `Used in ${set.interviewCount} ${set.interviewCount === 1 ? 'interview' : 'interviews'}`
  return `${used} · ${set.completedInterviewCount} completed`
}

const DuplicateDialog = ({ source, onDone, onClose }: { source: RubricSetSummary; onDone: (id: number) => void; onClose: () => void }) => {
  const [name, setName] = useState(`${source.name} (copy)`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      onDone((await duplicateRubricSet(source.id, name.trim())).id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate rubric set')
      setBusy(false)
    }
  }

  return (
    <Modal title="Duplicate rubric set" onClose={onClose} closeOnOverlay={false}>
      <h2 className="dialog-title">Duplicate rubric set</h2>
      <form onSubmit={submit}>
        <label className="dialog-label" htmlFor="dup-set-name">Name</label>
        <input id="dup-set-name" className="dialog-input" value={name} maxLength={255} onChange={e => setName(e.target.value)} disabled={busy} autoFocus />
        {error && <p className="dialog-error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="dialog-btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="dialog-btn primary" disabled={!name.trim() || busy}>{busy ? 'Creating...' : 'Create copy'}</button>
        </div>
      </form>
    </Modal>
  )
}

const RubricSetsPage = () => {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [items, setItems] = useState<RubricSetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [toDelete, setToDelete] = useState<RubricSetSummary | null>(null)
  const [toDuplicate, setToDuplicate] = useState<RubricSetSummary | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    fetchRubricSets(debouncedSearch)
      .then(result => { if (!cancelled) { setItems(result); setError(null) } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rubric sets') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedSearch, reloadKey])

  const handleDelete = async () => {
    if (!toDelete) return
    await deleteRubricSet(toDelete.id)
    setReloadKey(k => k + 1)
    toast('Rubric set deleted')
  }

  return (
    <div className="page">
      <PageHeader title="Rubric Sets" actions={<span className="chip">{items.length} {items.length === 1 ? 'set' : 'sets'}</span>} />

      <div className="page-body">
        <div className="list-toolbar">
          <div className="search-box">
            <MdSearch />
            <input type="search" placeholder="Search by name or role..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Search rubric sets" />
          </div>
        </div>

        {error && <ErrorBox message={error} onRetry={() => setReloadKey(k => k + 1)} />}
        {loading && items.length === 0 && !error && <LoadingState label="Loading rubric sets" />}

        {!loading && !error && items.length === 0 && (
          <div className="state-box">
            <MdInbox className="state-icon" />
            <p className="state-title">{debouncedSearch ? 'No matches' : 'No rubric sets yet'}</p>
            {!debouncedSearch && <p>Create reusable rubrics once, then start any interview from them.</p>}
            {!debouncedSearch && <button type="button" className="btn btn-primary" onClick={() => navigate(paths.rubricSetNew())}>New rubric set</button>}
          </div>
        )}

        {items.map(set => (
          <section key={set.id} className="iv-card rs-card">
            <div className="rs-card-main">
              <button type="button" className="title-link" onClick={() => navigate(paths.rubricSetEdit(set.id))}>{set.name}</button>
              <span className="iv-sub">
                {set.role && <span className="chip">{set.role}</span>}{' '}
                {set.rubricCount} {set.rubricCount === 1 ? 'rubric' : 'rubrics'} · {usageText(set)}
                {set.lastUsedAt && ` · last used ${formatRelative(set.lastUsedAt)}`}
              </span>
              {set.description && <span className="iv-muted">{set.description}</span>}
            </div>
            <div className="row-actions">
              <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${set.name}`} onClick={() => navigate(paths.rubricSetEdit(set.id))}><MdEdit /></button>
              <button type="button" className="icon-btn" title="Duplicate" aria-label={`Duplicate ${set.name}`} onClick={() => setToDuplicate(set)}><MdContentCopy /></button>
              <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${set.name}`} onClick={() => setToDelete(set)}><MdDelete /></button>
            </div>
          </section>
        ))}
      </div>

      <button type="button" className="fab" onClick={() => navigate(paths.rubricSetNew())} title="New rubric set (n)" aria-label="New rubric set">
        <MdAdd /> <span>New rubric set</span>
      </button>

      {toDelete && (
        <ConfirmDialog
          title="Delete rubric set"
          message={`Delete "${toDelete.name}"?${toDelete.interviewCount ? ` It was used in ${toDelete.interviewCount} ${toDelete.interviewCount === 1 ? 'interview' : 'interviews'}.` : ''} Existing interviews keep their rubrics and are not affected.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        />
      )}

      {toDuplicate && (
        <DuplicateDialog
          source={toDuplicate}
          onClose={() => setToDuplicate(null)}
          onDone={id => { setToDuplicate(null); toast('Rubric set duplicated'); navigate(paths.rubricSetEdit(id)) }}
        />
      )}
    </div>
  )
}

export default RubricSetsPage
