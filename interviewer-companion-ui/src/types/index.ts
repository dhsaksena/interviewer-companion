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

// Candidate profile extracted from a resume. Dates are "YYYY-MM" or "YYYY"; ongoing ones end with "Present"
export interface CandidateProfileLink {
  platform: string
  url: string
}

export interface CandidateEducation {
  institution: string
  degree?: string
  fieldOfStudy?: string
  startDate?: string
  endDate?: string
}

export interface CandidateProject {
  name: string
  description: string
  technologies: string[]
  contributions: string[]
}

export interface CandidateExperience {
  company: string
  title: string
  startDate?: string
  endDate?: string
  description: string[]
  projects: CandidateProject[]
}

export interface CandidateProfile {
  fullName: string
  headline?: string
  email?: string
  phone?: string
  location?: string
  summary?: string
  profileLinks: CandidateProfileLink[]
  education: CandidateEducation[]
  // Most recent role first
  experience: CandidateExperience[]
  skills: string[]
  certifications: string[]
}

export interface Candidate {
  id: number
  profile: CandidateProfile
  warnings: string[]
  resumeFileName: string
  createdAt: string
  updatedAt: string
}

export interface CandidateSummary {
  id: number
  fullName: string
  email: string
  headline: string
  topSkills: string[]
  resumeFileName: string
  updatedAt: string
}

// Progress streamed by the server (Server-Sent Events) for resume import and deep dives
export type StepStatus = 'pending' | 'active' | 'done' | 'failed'

export interface ProgressStep {
  key: string
  label: string
  status: StepStatus
  detail?: string
}

export interface ExtractedItem {
  key: string
  label: string
  status: StepStatus
  count?: number
}

export interface ProgressEvent {
  percent: number
  message: string
  steps: ProgressStep[]
  items?: ExtractedItem[]
}

export type DeepDiveType = 'identity' | 'career' | 'project' | 'publicFootprint' | 'skill'

export interface DeepDiveResult {
  workflowId: string
  type: DeepDiveType
  targetId: string
  label: string
  status: 'completed' | 'failed'
  findings: string[]
  warnings: string[]
  placeholder: boolean
  completedAt: string
}
