export interface RubricSetItem {
  id: number
  title: string
  description: string
}

export interface RubricSetSummary {
  id: number
  name: string
  role: string
  description: string
  updatedAt: Date
  rubricCount: number
  // Interviews started from this set, and how many of those are completed
  interviewCount: number
  completedInterviewCount: number
  lastUsedAt: Date | null
}

export interface RubricSet extends RubricSetSummary {
  items: RubricSetItem[]
}

export interface RubricSetItemInput {
  title: string
  description: string
}

export interface RubricSetInput {
  name: string
  role: string
  description: string
  items: RubricSetItemInput[]
}

export interface RubricSetInterviewRef {
  id: number
  title: string
  candidateName: string
  status: string
  interviewDate: string | null
}
