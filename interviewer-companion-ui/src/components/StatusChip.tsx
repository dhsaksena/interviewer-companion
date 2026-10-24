import type { InterviewStatus } from '../types'
import { STATUS_LABELS } from '../utils/interviewStatus'

const StatusChip = ({ status }: { status: InterviewStatus }) => (
  <span className={`chip status-${status}`}>{STATUS_LABELS[status]}</span>
)

export default StatusChip
