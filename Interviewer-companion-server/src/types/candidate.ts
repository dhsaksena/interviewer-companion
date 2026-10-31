import type { CandidateProfile } from './candidateProfile.js'

export interface Candidate {
  id: number
  profile: CandidateProfile
  // Notes from extraction, e.g. sections that couldn't be read
  warnings: string[]
  resumeFileName: string
  createdAt: Date
  updatedAt: Date
}

export interface CandidateSummary {
  id: number
  fullName: string
  email: string
  headline: string
  topSkills: string[]
  resumeFileName: string
  updatedAt: Date
}

export interface ListCandidatesParams {
  search: string
  page: number
  pageSize: number
}
