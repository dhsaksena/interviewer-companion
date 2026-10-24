export interface InterviewQuestionRef {
  id: number
  title: string
  difficulty: string
  category: string | null
}

export const INTERVIEW_STATUSES = ['draft', 'scheduled', 'completed'] as const
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]

export interface InterviewRubric {
  id: number
  title: string
  description: string
  // 1-5 score and free-text feedback captured during or after the interview
  rating: number | null
  feedback: string
  questions: InterviewQuestionRef[]
}

export interface Interview {
  id: number
  title: string
  candidateName: string
  notes: string
  status: InterviewStatus
  // YYYY-MM-DD or null
  interviewDate: string | null
  createdAt: Date
  updatedAt: Date
  rubrics: InterviewRubric[]
}

export interface InterviewSummary {
  id: number
  title: string
  candidateName: string
  notes: string
  status: InterviewStatus
  interviewDate: string | null
  updatedAt: Date
  rubricCount: number
  questionCount: number
  // Title of the first rubric that matched the search text, when the match came from a rubric
  matchedRubric: string | null
}

export interface RubricInput {
  title: string
  description: string
  rating: number | null
  feedback: string
  questionIds: number[]
}

export interface InterviewInput {
  title: string
  candidateName: string
  notes: string
  status: InterviewStatus
  interviewDate: string | null
  rubrics: RubricInput[]
}

export type InterviewSortKey = 'title' | 'candidate' | 'rubrics' | 'questions' | 'updated' | 'date'

export interface ListInterviewsParams {
  search: string
  sort: InterviewSortKey
  dir: 'asc' | 'desc'
  page: number
  pageSize: number
  questionFilter: 'all' | 'with' | 'without'
  status: InterviewStatus | 'all'
}

export interface InterviewUsage {
  id: number
  title: string
  candidateName: string
}
