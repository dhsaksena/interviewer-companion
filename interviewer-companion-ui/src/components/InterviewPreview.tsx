import type { Interview } from '../types'
import { formatRelative } from '../utils/formatRelative'
import { formatDate } from '../utils/interviewStatus'
import StatusChip from './StatusChip'

interface InterviewPreviewProps {
  interview: Interview
  onOpen: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const InterviewPreview = ({ interview, onOpen, onEdit, onDuplicate, onDelete }: InterviewPreviewProps) => (
  <>
    <div className="iv-preview-head">
      <h2 title={interview.title}>{interview.title}</h2>
      <p className="iv-muted">
        <StatusChip status={interview.status} />{interview.interviewDate ? ` ${formatDate(interview.interviewDate)}` : ''}
      </p>
      <p className="iv-muted">
        {interview.candidateName || 'No candidate'}
        {interview.notes ? ` · ${interview.notes}` : ''} · Updated {formatRelative(interview.updatedAt)}
      </p>
    </div>

    <div className="iv-preview-body">
      {interview.rubrics.length === 0 && <p className="iv-muted">No rubrics yet</p>}
      {interview.rubrics.map((rubric, index) => (
        <div key={rubric.id} className="iv-preview-rubric">
          <strong>{index + 1}. {rubric.title}{rubric.rating ? ` · ${rubric.rating}/5` : ''}</strong>
          {rubric.description && <p>{rubric.description}</p>}
          {rubric.questions.length === 0
            ? <span className="iv-muted">No questions assigned</span>
            : rubric.questions.map(q => (
              <div key={q.id} className="iv-qrow">
                <span className={`chip difficulty-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                <span className="iv-qrow-title" title={q.title}>{q.title}</span>
              </div>
            ))}
        </div>
      ))}
    </div>

    <div className="iv-preview-foot">
      <button type="button" className="btn btn-primary" onClick={onOpen}>Open</button>
      <button type="button" className="btn btn-secondary" onClick={onEdit}>Edit</button>
      <button type="button" className="btn btn-secondary" onClick={onDuplicate}>Duplicate</button>
      <button type="button" className="btn btn-danger-outline" onClick={onDelete}>Delete</button>
    </div>
  </>
)

export default InterviewPreview
