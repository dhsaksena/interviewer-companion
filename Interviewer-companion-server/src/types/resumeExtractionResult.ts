import type { CandidateProfile } from './candidateProfile.js'

export interface ResumeExtractionResult {
  candidateProfile: CandidateProfile
  warnings: string[]
}