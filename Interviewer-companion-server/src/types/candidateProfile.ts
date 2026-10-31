export interface CandidateProfile
{
  fullName: string
  // Current role as written on the resume, e.g. "Senior Data Engineer"
  headline?: string
  email?: string
  phone?: string
  location?: string
  summary?: string
  profileLinks: CandidateProfileLink[]
  education: Education[]
  // Most recent role first
  experience: WorkExperience[]
  skills: string[]
  certifications: string[]
}

export interface CandidateProfileLink {
  platform: string
  url: string
}

// Dates are "YYYY-MM" or "YYYY"; an ongoing role or course has endDate "Present"
export interface Education {
  institution: string
  degree?: string
  fieldOfStudy?: string
  startDate?: string
  endDate?: string
}


export interface WorkExperience {
  company: string
  title: string
  startDate?: string
  endDate?: string
  description: string[]
  projects: CandidateProject[]
}

export interface CandidateProject {
  name: string
  description: string
  technologies: string[]
  contributions: string[]
}
