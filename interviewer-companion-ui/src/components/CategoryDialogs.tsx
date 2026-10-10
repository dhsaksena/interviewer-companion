import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import './CategoryDialogs.css'

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong')

interface DialogShellProps {
  title: string
  onClose: () => void
  children: ReactNode
}

const DialogShell = ({ title, onClose, children }: DialogShellProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="dialog-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

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
  onConfirm: () => Promise<void>
  onClose: () => void
}

export const ConfirmDialog = ({ title, message, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) => {
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
          Cancel
        </button>
        <button type="button" className="dialog-btn danger" onClick={handleConfirm} disabled={submitting}>
          {submitting ? 'Deleting...' : confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}
