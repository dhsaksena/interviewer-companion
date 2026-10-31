import { MdInfoOutline, MdTravelExplore } from 'react-icons/md'
import ProgressSteps from '../ProgressSteps'
import type { DeepDiveResult, ProgressEvent } from '../../types'
import { formatRelative } from '../../utils/formatRelative'

export interface DeepDiveRun {
  status: 'running' | 'done' | 'failed'
  progress: ProgressEvent
  result?: DeepDiveResult
  error?: string
}

interface DeepDivePanelProps {
  label: string | null
  typeLabel: string
  run: DeepDiveRun | undefined
  onRun: () => void
  onCancel: () => void
}

const DeepDivePanel = ({ label, typeLabel, run, onRun, onCancel }: DeepDivePanelProps) => {
  if (!label) {
    return (
      <aside className="cd-panel dd-panel dd-empty">
        <MdTravelExplore className="dd-empty-icon" aria-hidden="true" />
        <strong>Deep dive</strong>
        <p>Select any node in the graph to research it. The candidate in the middle runs an identity check.</p>
      </aside>
    )
  }

  return (
    <aside className="cd-panel dd-panel" aria-live="polite">
      <span className="chip dd-type">{typeLabel} deep dive</span>
      <h3 title={label}>{label}</h3>

      {run && (run.status === 'running' || run.status === 'failed') && (
        <ProgressSteps progress={run.progress} failed={run.status === 'failed'} />
      )}

      {run?.status === 'failed' && <p className="dialog-error" role="alert">{run.error}</p>}

      {run?.status === 'done' && run.result && (
        <>
          {run.result.placeholder && (
            <div className="alert alert-info dd-note">
              <MdInfoOutline aria-hidden="true" />
              <span>The research agent for this node isn't built yet. These findings are what the resume says.</span>
            </div>
          )}
          <h4>Findings</h4>
          {run.result.findings.length === 0
            ? <p className="cd-muted">No findings.</p>
            : <ul className="cd-list dd-findings">{run.result.findings.map((f, i) => <li key={i}>{f}</li>)}</ul>}
          {run.result.warnings.length > 0 && (
            <>
              <h4>Warnings</h4>
              <ul className="cd-list">{run.result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </>
          )}
          <p className="cd-muted dd-meta">Completed {formatRelative(run.result.completedAt)}</p>
        </>
      )}

      <div className="dd-actions">
        {run?.status === 'running'
          ? <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          : <button type="button" className="btn btn-primary" onClick={onRun}>{run ? 'Run again' : 'Run deep dive'}</button>}
      </div>
    </aside>
  )
}

export default DeepDivePanel
