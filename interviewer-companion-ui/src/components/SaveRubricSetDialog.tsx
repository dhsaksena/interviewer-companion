import { useState, type FormEvent } from 'react'
import './CategoryDialogs.css'
import Modal from './Modal'
import { createRubricSet } from '../api/rubricSetsApi'

interface SaveRubricSetDialogProps {
  items: { title: string; description: string }[]
  defaultName: string
  onSaved: () => void
  onClose: () => void
}

// Saves the given rubrics as a new reusable rubric set. Does not touch the interview being edited.
const SaveRubricSetDialog = ({ items, defaultName, onSaved, onClose }: SaveRubricSetDialogProps) => {
  const [name, setName] = useState(defaultName)
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await createRubricSet({ name: name.trim(), role: role.trim(), description: '', items })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rubric set')
      setBusy(false)
    }
  }

  return (
    <Modal title="Save as rubric set" onClose={onClose} closeOnOverlay={false}>
      <h2 className="dialog-title">Save as rubric set</h2>
      <form onSubmit={handleSubmit}>
        <label className="dialog-label" htmlFor="save-set-name">Name</label>
        <input id="save-set-name" className="dialog-input" value={name} maxLength={255} onChange={e => setName(e.target.value)} disabled={busy} autoFocus />
        <label className="dialog-label" htmlFor="save-set-role" style={{ marginTop: 12 }}>Role</label>
        <input id="save-set-role" className="dialog-input" value={role} maxLength={255} onChange={e => setRole(e.target.value)} disabled={busy} />
        <p className="dialog-message" style={{ marginTop: 10 }}>
          Saves {items.length} {items.length === 1 ? 'rubric' : 'rubrics'} (titles and descriptions only, no questions, ratings or feedback). This interview is not changed.
        </p>
        {error && <p className="dialog-error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="dialog-btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="dialog-btn primary" disabled={!name.trim() || busy}>{busy ? 'Saving...' : 'Save set'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default SaveRubricSetDialog
