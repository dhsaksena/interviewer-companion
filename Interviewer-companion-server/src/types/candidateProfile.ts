export interface CandidateProfile
{
  fullName: string
  email?: string
  phone?: string
  summary?: string
  profileLinks: CandidateProfileLink[]
  education: Education[]
  experience: WorkExperience[]
  skills: string[]
  certifications: string[]
}

export interface CandidateProfileLink {
  platform: string
  url: string
}

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