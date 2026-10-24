import type { InterviewStatus } from '../types'

export const STATUS_LABELS: Record<InterviewStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  completed: 'Completed',
}

export const STATUSES = Object.keys(STATUS_LABELS) as InterviewStatus[]

// "2026-03-14" -> "14 Mar 2026" without timezone shifts
export const formatDate = (date: string | null) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
