import path from 'path'
import { PdfParser } from './document/pdfParser.js'
import { DocxParser } from './document/docxParser.js'
import { ResumeAnalysisAgent } from '../agents/resume-analysis/resumeAnalysisAgent.js'
import { AppError } from '../middleware/errorHandler.js'
import { ProgressTracker } from '../utils/progressTracker.js'
import type { CandidateProfile } from '../types/candidateProfile.js'
import type { ExtractedItem } from '../types/progress.js'
import type { ResumeExtractionResult } from '../types/resumeExtractionResult.js'

// Plenty for a long resume; keeps a malformed file from producing a huge prompt
const MAX_RESUME_CHARS = 60_000

export const RESUME_EXTENSIONS = ['.pdf', '.docx']

export const IMPORT_STEPS = [
  { key: 'upload', label: 'Upload resume' },
  { key: 'read', label: 'Read document' },
  { key: 'analyze', label: 'Extract profile with AI' },
  { key: 'save', label: 'Save candidate' },
]

// Percent of the whole import reached when the AI step starts and when it finishes
const ANALYZE_START = 30
const ANALYZE_END = 88

// Sections of the profile in the order the model writes them (the schema's field order)
const CONTACT_FIELDS = ['fullName', 'headline', 'email', 'phone', 'location', 'summary']
const SECTION_POSITION: Record<string, number> = { profileLinks: 1, education: 2, experience: 3, skills: 4, certifications: 5 }
const SECTION_COUNT = 6

type PartialProfile = Partial<Record<string, unknown>>

const lengthOf = (value: unknown) => (Array.isArray(value) ? value.length : 0)

// What has been extracted so far. A section is done once the model has moved on to a later one.
const extractedItems = (profile: PartialProfile, finished: boolean): { items: ExtractedItem[]; reached: number } => {
  let reached = -1
  if (CONTACT_FIELDS.some(field => field in profile)) reached = 0
  for (const [key, position] of Object.entries(SECTION_POSITION)) {
    if (key in profile) reached = Math.max(reached, position)
  }
  if (finished) reached = SECTION_COUNT

  const statusAt = (position: number) => (position < reached ? 'done' : position === reached ? 'active' : 'pending')
  const experience = Array.isArray(profile.experience) ? (profile.experience as { projects?: unknown }[]) : []

  return {
    reached,
    items: [
      { key: 'contact', label: 'Name and contact details', status: statusAt(0) },
      { key: 'profileLinks', label: 'Online profiles', status: statusAt(1), count: lengthOf(profile.profileLinks) },
      { key: 'education', label: 'Education', status: statusAt(2), count: lengthOf(profile.education) },
      { key: 'experience', label: 'Work history', status: statusAt(3), count: experience.length },
      { key: 'projects', label: 'Projects', status: statusAt(3), count: experience.reduce((n, role) => n + lengthOf(role?.projects), 0) },
      { key: 'skills', label: 'Skills', status: statusAt(4), count: lengthOf(profile.skills) },
      { key: 'certifications', label: 'Certifications', status: statusAt(5), count: lengthOf(profile.certifications) },
    ],
  }
}

const parseDocument = async (file: Express.Multer.File) => {
  const isPdf = path.extname(file.originalname).toLowerCase() === '.pdf'
  try {
    if (isPdf) {
      const result = await new PdfParser().parse(file.buffer)
      return { text: result.text, warnings: result.warnings, pages: result.totalPages }
    }
    return { ...(await new DocxParser().parse(file.buffer)), pages: undefined }
  } catch (error) {
    console.error('[RESUME] Text extraction failed:', error)
    throw new AppError(422, 'Could not read this file. Check that it is a valid PDF or Word (.docx) document.')
  }
}

const clean = (value: string | undefined) => value?.trim() || undefined
const cleanList = (values: string[]) => values.map(v => v.trim()).filter(Boolean)

const dedupe = (values: string[]) => {
  const seen = new Set<string>()
  return cleanList(values).filter(value => {
    const key = value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const normalize = (profile: CandidateProfile): CandidateProfile => ({
  fullName: profile.fullName.trim() || 'Unnamed candidate',
  headline: clean(profile.headline),
  email: clean(profile.email),
  phone: clean(profile.phone),
  location: clean(profile.location),
  summary: clean(profile.summary),
  profileLinks: profile.profileLinks.filter(link => link.url.trim()),
  education: profile.education.filter(e => e.institution.trim()),
  experience: profile.experience
    .filter(e => e.company.trim() || e.title.trim())
    .map(e => ({
      ...e,
      description: cleanList(e.description),
      projects: e.projects.map(p => ({ ...p, technologies: dedupe(p.technologies), contributions: cleanList(p.contributions) })),
    })),
  skills: dedupe(profile.skills),
  certifications: dedupe(profile.certifications),
})

interface AnalyzeOptions {
  progress?: ProgressTracker
  signal?: AbortSignal
}

// Resume file -> text -> structured profile via the resume analysis agent.
// Reports the upload, read and analyze steps; the caller reports saving.
export const analyzeResume = async (file: Express.Multer.File, { progress, signal }: AnalyzeOptions = {}): Promise<ResumeExtractionResult> => {
  progress?.step('upload', 'done', { percent: 5, message: 'Resume received', detail: `${file.originalname} · ${Math.max(1, Math.round(file.size / 1024))} KB` })
  progress?.step('read', 'active', { percent: 10, message: 'Reading the document' })

  const parsed = await parseDocument(file)
  const warnings = [...parsed.warnings]

  let text = parsed.text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (text.length < 50) {
    throw new AppError(422, 'No text found in this resume. Scanned or image-only PDFs are not supported yet.')
  }
  if (text.length > MAX_RESUME_CHARS) {
    text = text.slice(0, MAX_RESUME_CHARS)
    warnings.push('The resume was very long, so only the first part was analyzed.')
  }
  const pages = parsed.pages ? `${parsed.pages} page${parsed.pages === 1 ? '' : 's'} · ` : ''
  progress?.step('read', 'done', { percent: 25, message: 'Document read', detail: `${pages}${text.length.toLocaleString('en-US')} characters` })

  let agent: ResumeAnalysisAgent
  try {
    agent = new ResumeAnalysisAgent()
  } catch (error) {
    console.error('[RESUME] AI model is not configured:', error)
    throw new AppError(503, 'Resume analysis is not configured on the server.')
  }

  progress?.step('analyze', 'active', { percent: ANALYZE_START, message: 'Sending the resume to the AI model' })

  // Only report when a section's status or count changes, not on every streamed token
  let lastSignature = ''
  const report = (profile: PartialProfile, finished: boolean) => {
    const { items, reached } = extractedItems(profile, finished)
    const signature = JSON.stringify(items.map(i => [i.status, i.count]))
    if (signature === lastSignature) return
    lastSignature = signature
    const active = items.find(i => i.status === 'active')
    progress?.setItems(items, {
      percent: ANALYZE_START + ((ANALYZE_END - ANALYZE_START) * Math.min(Math.max(reached, 0), SECTION_COUNT)) / SECTION_COUNT,
      message: finished ? 'Profile extracted' : active ? `Extracting ${active.label.toLowerCase()}` : 'Analyzing the resume',
    })
  }

  try {
    const result = await agent.executeStreaming(
      { resumeText: text },
      { signal, onPartial: partial => report(partial.candidateProfile ?? {}, false) }
    )
    report(result.candidateProfile as unknown as PartialProfile, true)
    progress?.step('analyze', 'done', { percent: ANALYZE_END, message: 'Profile extracted' })
    return {
      candidateProfile: normalize(result.candidateProfile),
      warnings: [...warnings, ...cleanList(result.warnings)],
    }
  } catch (error) {
    if (signal?.aborted) throw error
    console.error('[RESUME] Profile extraction failed:', error)
    throw new AppError(502, 'Could not analyze this resume right now. Please try again.')
  }
}
