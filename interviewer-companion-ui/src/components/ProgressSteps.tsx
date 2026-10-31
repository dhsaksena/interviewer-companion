import { MdCheckCircle, MdError, MdRadioButtonUnchecked } from 'react-icons/md'
import type { ExtractedItem, ProgressEvent, StepStatus } from '../types'

// How each extracted section is counted, e.g. "3 roles"
const NOUNS: Record<string, [string, string]> = {
  profileLinks: ['profile', 'profiles'],
  education: ['entry', 'entries'],
  experience: ['role', 'roles'],
  projects: ['project', 'projects'],
  skills: ['skill', 'skills'],
  certifications: ['certification', 'certifications'],
}

const countText = (item: ExtractedItem) => {
  if (item.status === 'pending') return ''
  const noun = NOUNS[item.key]
  if (!noun || item.count === undefined) return item.status === 'done' ? 'found' : ''
  if (item.status === 'done' && item.count === 0) return 'none found'
  const text = `${item.count} ${item.count === 1 ? noun[0] : noun[1]}`
  return item.status === 'active' ? `${text} so far` : text
}

export const StatusIcon = ({ status }: { status: StepStatus }) => {
  if (status === 'done') return <MdCheckCircle className="pg-icon done" aria-label="Done" />
  if (status === 'failed') return <MdError className="pg-icon failed" aria-label="Failed" />
  if (status === 'active') return <span className="pg-spinner" aria-label="In progress" />
  return <MdRadioButtonUnchecked className="pg-icon pending" aria-label="Not started" />
}

interface ProgressStepsProps {
  progress: ProgressEvent
  // The step under which the extracted sections are listed
  itemsStep?: string
  // Shown in place of the step message while the active step has nothing new to report
  waitingHint?: string
  failed?: boolean
}

const ProgressSteps = ({ progress, itemsStep, waitingHint, failed }: ProgressStepsProps) => {
  const { percent, message, steps, items } = progress
  const waiting = !failed && !!waitingHint && percent < 100 && !items && steps.some(s => s.key === itemsStep && s.status === 'active')

  return (
    <div className="pg">
      <div className="pg-head">
        <span className="pg-message" aria-live="polite">{waiting ? waitingHint : message}</span>
        <span className="pg-percent">{percent}%</span>
      </div>
      <div
        className={`pg-bar ${failed ? 'failed' : ''} ${waiting ? 'waiting' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progress"
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      <ol className="pg-steps">
        {steps.map(step => (
          <li key={step.key} className={`pg-step ${step.status}`}>
            <StatusIcon status={step.status} />
            <div className="pg-step-text">
              <span className="pg-step-label">{step.label}</span>
              {step.detail && <span className="pg-step-detail">{step.detail}</span>}
              {step.key === itemsStep && items && (
                <ul className="pg-items">
                  {items.map(item => (
                    <li key={item.key} className={`pg-item ${item.status}`}>
                      <StatusIcon status={item.status} />
                      <span>{item.label}</span>
                      <span className="pg-item-count">{countText(item)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default ProgressSteps
