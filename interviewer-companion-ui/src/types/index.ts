export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type QuestionType = 'Conceptual' | 'Coding' | 'Scenario' | 'Behavioural'

export interface Question {
    id: number
    title: string
    category: string
    subcategory?: string
    difficulty: Difficulty
    type: QuestionType
    viewedAt?: Date
}

export interface Category {
  name: string
  expanded: boolean
  subcategories: string[]
}

export interface SubcategoryRecord {
  id: number
  name: string
  question_count?: number
}

export interface CategoryRecord {
  id: number
  name: string
  subcategories: SubcategoryRecord[]
}
export interface AuthUser {
  id: number
  email: string
  name: string
  picture: string | null
}

export interface InterviewQuestionRef {
  id: number
  title: string
  difficulty: Difficulty
  category: string | null
}

export type InterviewStatus = 'draft' | 'scheduled' | 'completed'

export interface InterviewRubric {
  id: number
  title: string
  description: string
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
  interviewDate: string | null
  createdAt: string
  updatedAt: string
  rubrics: InterviewRubric[]
}

export interface InterviewSummary {
  id: number
  title: string
  candidateName: string
  notes: string
  status: InterviewStatus
  interviewDate: string | null
  updatedAt: string
  rubricCount: number
  questionCount: number
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

export interface InterviewListQuery {
  q: string
  sort: InterviewSortKey
  dir: 'asc' | 'desc'
  page: number
  pageSize: number
  questions: 'all' | 'with' | 'without'
  status: InterviewStatus | 'all'
}

export interface InterviewUsage {
  id: number
  title: string
  candidateName: string
}
