import { useState, type FormEvent, type ReactNode } from 'react'
import './CategoryDialogs.css'
import Modal from './Modal'

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')

interface DialogShellProps {
  title: string
  onClose: () => void
  children: ReactNode
}

const DialogShell = ({ title, onClose, children }: DialogShellProps) => (
  <Modal title={title} onClose={onClose}>
    <h2 className="dialog-title">{title}</h2>
    {children}
  </Modal>
)

export interface NameDialogProps {
  title: string
  label: string
  initialValue: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void>
  onClose: () => void
}

export const NameDialog = ({ title, label, initialValue, submitLabel, onSubmit, onClose }: NameDialogProps) => {
  const [value, setValue] = useState(initialValue)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = value.trim()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(trimmed)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <DialogShell title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="dialog-label" htmlFor="dialog-name">{label}</label>
        <input
          id="dialog-name"
          className="dialog-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={submitting}
          autoFocus
        />
        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="dialog-btn secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="dialog-btn primary" disabled={!trimmed || submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

export interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  busyLabel?: string
  // Non-destructive confirmations (e.g. leaving a page) use the regular button style
  tone?: 'danger' | 'primary'
  cancelLabel?: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export const ConfirmDialog = ({ title, message, confirmLabel, busyLabel = 'Deleting...', tone = 'danger', cancelLabel = 'Cancel', onConfirm, onClose }: ConfirmDialogProps) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <DialogShell title={title} onClose={onClose}>
      <p className="dialog-message">{message}</p>
      {error && <p className="dialog-error">{error}</p>}

      <div className="dialog-actions">
        <button type="button" className="dialog-btn secondary" onClick={onClose} disabled={submitting}>
          {cancelLabel}
        </button>
        <button type="button" className={`dialog-btn ${tone}`} onClick={handleConfirm} disabled={submitting}>
          {submitting ? busyLabel : confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}
