import type { CandidateExperience, CandidateProfile } from '../types'

// Dates arrive as "YYYY-MM", "YYYY" or "Present"; everything here works in month indexes (year * 12 + month)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const nowMonth = () => {
  const now = new Date()
  return now.getFullYear() * 12 + now.getMonth()
}

const isPresent = (value?: string) => !!value && /^(present|current|now|ongoing)$/i.test(value.trim())

// A bare year starts in January and ends in December
const toMonth = (value: string | undefined, edge: 'start' | 'end'): number | null => {
  if (!value) return null
  if (isPresent(value)) return nowMonth()
  const match = value.trim().match(/^(\d{4})(?:-(\d{1,2}))?/)
  if (!match) return null
  const year = Number(match[1])
  const month = match[2] ? Number(match[2]) - 1 : edge === 'start' ? 0 : 11
  return year * 12 + Math.min(11, Math.max(0, month))
}

export const formatPeriodDate = (value?: string) => {
  if (!value) return ''
  if (isPresent(value)) return 'Present'
  const match = value.trim().match(/^(\d{4})(?:-(\d{1,2}))?/)
  if (!match) return value
  return match[2] ? `${MONTHS[Number(match[2]) - 1] ?? ''} ${match[1]}`.trim() : match[1]
}

export const formatPeriod = (start?: string, end?: string) =>
  [formatPeriodDate(start), formatPeriodDate(end)].filter(Boolean).join(' – ')

export const formatDuration = (months: number) => {
  if (months <= 0) return '< 1 mo'
  const years = Math.floor(months / 12)
  const rest = months % 12
  return [years && `${years} yr${years === 1 ? '' : 's'}`, rest && `${rest} mo${rest === 1 ? '' : 's'}`].filter(Boolean).join(' ')
}

export interface RoleSpan {
  role: CandidateExperience
  start: number
  // Exclusive: a role from Mar to Mar is one month long
  end: number
  current: boolean
}

// Roles with a readable start date. An unreadable end means the role is treated as one month long.
export const roleSpans = (experience: CandidateExperience[]): RoleSpan[] =>
  experience.flatMap(role => {
    const start = toMonth(role.startDate, 'start')
    if (start === null) return []
    const end = toMonth(role.endDate, 'end') ?? start
    return [{ role, start, end: Math.max(end, start) + 1, current: isPresent(role.endDate) }]
  })

// Total time employed, counting overlapping roles once
export const totalExperienceMonths = (spans: RoleSpan[]) => {
  const sorted = [...spans].sort((a, b) => a.start - b.start)
  let total = 0
  let cursor = -Infinity
  for (const span of sorted) {
    const from = Math.max(span.start, cursor)
    if (span.end > from) total += span.end - from
    cursor = Math.max(cursor, span.end)
  }
  return total
}

export const monthToYear = (month: number) => Math.floor(month / 12)

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const roleText = (role: CandidateExperience) =>
  [
    role.title,
    ...role.description,
    ...role.projects.flatMap(p => [p.name, p.description, ...p.technologies, ...p.contributions]),
  ].join(' \n ').toLowerCase()

export interface SkillUsage {
  skill: string
  // Companies whose role text mentions the skill, most recent first
  companies: string[]
}

// For each listed skill, which roles mention it. Matches whole terms, so "Java" doesn't match "JavaScript".
export const skillUsage = (profile: CandidateProfile): SkillUsage[] => {
  const texts = profile.experience.map(roleText)
  return profile.skills
    .map(skill => {
      const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(skill.toLowerCase())}($|[^a-z0-9+#])`)
      return {
        skill,
        companies: profile.experience.filter((_, i) => pattern.test(texts[i])).map(r => r.company || r.title),
      }
    })
    .filter(usage => usage.companies.length > 0)
    .sort((a, b) => b.companies.length - a.companies.length)
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?'

// Resume links are often written without a scheme ("linkedin.com/in/...")
export const toHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)
