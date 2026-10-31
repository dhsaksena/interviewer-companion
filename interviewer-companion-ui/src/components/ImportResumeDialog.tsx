import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { MdUploadFile, MdInsertDriveFile } from 'react-icons/md'
import Modal from './Modal'
import ProgressSteps from './ProgressSteps'
import type { Candidate, ProgressEvent } from '../types'
import { importResume } from '../api/candidatesApi'

const ACCEPTED = ['.pdf', '.docx']
const MAX_MB = 5

// Shown until the server's first event arrives (same steps the server reports)
const STARTING: ProgressEvent = {
  percent: 0,
  message: 'Uploading the resume',
  steps: [
    { key: 'upload', label: 'Upload resume', status: 'active' },
    { key: 'read', label: 'Read document', status: 'pending' },
    { key: 'analyze', label: 'Extract profile with AI', status: 'pending' },
    { key: 'save', label: 'Save candidate', status: 'pending' },
  ],
}

type Phase = 'choose' | 'importing' | 'done' | 'failed' | 'cancelled'

interface ImportResumeDialogProps {
  onClose: () => void
  // Called once the candidate is saved; the dialog stays open showing what was imported
  onImported: (candidate: Candidate) => void
  onOpen: (candidate: Candidate) => void
}

const checkFile = (file: File): string | null => {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!ACCEPTED.includes(extension)) return 'Choose a PDF or Word (.docx) file.'
  if (file.size > MAX_MB * 1024 * 1024) return `The file must be under ${MAX_MB} MB.`
  return null
}

const ImportResumeDialog = ({ onClose, onImported, onOpen }: ImportResumeDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState<Phase>('choose')
  const [progress, setProgress] = useState<ProgressEvent>(STARTING)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Closing the dialog mid-import cancels it on the server
  useEffect(() => () => abortRef.current?.abort(), [])

  // Modal re-binds Escape and moves focus whenever onClose changes, so keep it stable across the
  // many re-renders from progress events. While importing, Escape cancels instead of closing.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  const handleClose = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    else onCloseRef.current()
  }, [])

  const pick = (picked: File | undefined) => {
    if (!picked) return
    const problem = checkFile(picked)
    setError(problem)
    setFile(problem ? null : picked)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  const start = async () => {
    if (!file) return
    const controller = new AbortController()
    abortRef.current = controller
    setPhase('importing')
    setProgress(STARTING)
    setError(null)
    try {
      const saved = await importResume(file, setProgress, controller.signal)
      setCandidate(saved)
      setPhase('done')
      onImported(saved)
    } catch (err) {
      if (controller.signal.aborted) {
        setPhase('cancelled')
      } else {
        setError(err instanceof Error ? err.message : 'Import failed')
        setPhase('failed')
        // Mark the step that was running as failed, in case the server couldn't say so
        setProgress(prev => ({ ...prev, steps: prev.steps.map(s => (s.status === 'active' ? { ...s, status: 'failed' } : s)) }))
      }
    } finally {
      abortRef.current = null
    }
  }

  const cancel = () => abortRef.current?.abort()
  const reset = () => { setPhase('choose'); setFile(null); setError(null); setCandidate(null) }

  const importing = phase === 'importing'
  const title = phase === 'done' ? 'Resume imported' : 'Import resume'

  return (
    // Escape / outside click must not silently drop a running import
    <Modal title={title} onClose={handleClose} closeOnOverlay={!importing} className="dialog cd-import">
      <h2 className="dialog-title">{title}</h2>

      {phase === 'choose' && (
        <>
          <p className="dialog-message">We'll read the resume and build the candidate's profile. The file itself isn't stored.</p>
          <div
            className={`cd-dropzone ${dragging ? 'dragging' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Choose a resume file, or drop one here"
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <>
                <MdInsertDriveFile className="cd-dropzone-icon" />
                <strong className="cd-file-name" title={file.name}>{file.name}</strong>
                <span>{(file.size / 1024).toFixed(0)} KB · click to choose another file</span>
              </>
            ) : (
              <>
                <MdUploadFile className="cd-dropzone-icon" />
                <strong>Drop a resume here or click to browse</strong>
                <span>PDF or Word (.docx), up to {MAX_MB} MB</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(',')}
              hidden
              onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }}
            />
          </div>
        </>
      )}

      {phase !== 'choose' && (
        <>
          {file && <p className="cd-import-file"><MdInsertDriveFile aria-hidden="true" /> {file.name}</p>}
          <ProgressSteps
            progress={progress}
            itemsStep="analyze"
            waitingHint="The AI is reading the resume…"
            failed={phase === 'failed' || phase === 'cancelled'}
          />
        </>
      )}

      {phase === 'cancelled' && <p className="dialog-hint" role="status">Import cancelled. Nothing was saved.</p>}
      {error && <p className="dialog-error" role="alert">{error}</p>}

      <div className="dialog-actions">
        {phase === 'choose' && (
          <>
            <button type="button" className="dialog-btn secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="dialog-btn primary" onClick={start} disabled={!file}>Import</button>
          </>
        )}
        {importing && <button type="button" className="dialog-btn secondary" onClick={cancel}>Cancel import</button>}
        {(phase === 'failed' || phase === 'cancelled') && (
          <>
            <button type="button" className="dialog-btn secondary" onClick={onClose}>Close</button>
            <button type="button" className="dialog-btn secondary" onClick={reset}>Choose another file</button>
            <button type="button" className="dialog-btn primary" onClick={start}>Try again</button>
          </>
        )}
        {phase === 'done' && candidate && (
          <>
            <button type="button" className="dialog-btn secondary" onClick={reset}>Import another</button>
            <button type="button" className="dialog-btn primary" onClick={() => onOpen(candidate)}>View profile</button>
          </>
        )}
      </div>
    </Modal>
  )
}

export default ImportResumeDialog
