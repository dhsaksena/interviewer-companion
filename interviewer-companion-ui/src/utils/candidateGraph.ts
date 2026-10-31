import type { CandidateProfile } from '../types'
import { formatPeriod, skillUsage } from './candidateStats'

// Layout for the candidate graph: the candidate in the middle, category hubs either side,
// and one node per item stacked in rows on the outside, so labels never overlap.
// All numbers are SVG viewBox units.

export type GraphCategory = 'career' | 'education' | 'projects' | 'skills' | 'online'

export interface GraphLeaf {
  // Deep-dive target id understood by the server ("role:0", "skill:3", ...), or "more:<category>"
  id: string
  category: GraphCategory
  label: string
  sublabel: string
  tooltip: string
  deepDive: boolean
  x: number
  y: number
}

export interface GraphHub {
  category: GraphCategory
  label: string
  count: number
  side: 'left' | 'right'
  x: number
  y: number
}

export interface GraphEdge {
  id: string
  path: string
}

export interface CandidateGraphModel {
  width: number
  height: number
  center: { x: number; y: number }
  hubs: GraphHub[]
  leaves: GraphLeaf[]
  edges: GraphEdge[]
}

export const GRAPH = {
  width: 1000,
  leafWidth: 210,
  leafHeight: 36,
  hubWidth: 178,
  hubHeight: 36,
  centerRadius: 46,
  row: 44,
  groupGap: 24,
  padding: 28,
  minHeight: 380,
  hubX: { left: 335, right: 665 },
  leafX: { left: 16, right: 1000 - 16 - 210 },
}

const MAX_SKILLS = 10

const HUB_LABELS: Record<GraphCategory, string> = {
  career: 'Career',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  online: 'Online presence',
}

const SIDES: Record<'left' | 'right', GraphCategory[]> = {
  left: ['career', 'education'],
  right: ['projects', 'skills', 'online'],
}

type LeafSpec = Omit<GraphLeaf, 'x' | 'y'>

const hostOf = (url: string) => {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const leavesByCategory = (profile: CandidateProfile): Record<GraphCategory, LeafSpec[]> => {
  const usage = new Map(skillUsage(profile).map(u => [u.skill, u.companies]))
  // Most-used skills first; ids keep the index into profile.skills
  const skills = profile.skills
    .map((skill, index) => ({ skill, index, companies: usage.get(skill) ?? [] }))
    .sort((a, b) => b.companies.length - a.companies.length)
  const hidden = Math.max(0, skills.length - MAX_SKILLS)

  return {
    career: profile.experience.map((role, i) => ({
      id: `role:${i}`,
      category: 'career',
      label: role.title || role.company,
      sublabel: role.company,
      tooltip: `${role.title} at ${role.company}${formatPeriod(role.startDate, role.endDate) ? ` (${formatPeriod(role.startDate, role.endDate)})` : ''}`,
      deepDive: true,
    })),
    education: [
      ...profile.education.map((edu, i): LeafSpec => ({
        id: `education:${i}`,
        category: 'education',
        label: [edu.degree, edu.fieldOfStudy].filter(Boolean).join(', ') || edu.institution,
        sublabel: edu.degree || edu.fieldOfStudy ? edu.institution : formatPeriod(edu.startDate, edu.endDate),
        tooltip: [edu.degree, edu.fieldOfStudy, edu.institution].filter(Boolean).join(' · '),
        deepDive: true,
      })),
      ...profile.certifications.map((cert, i): LeafSpec => ({
        id: `certification:${i}`,
        category: 'education',
        label: cert,
        sublabel: 'Certification',
        tooltip: cert,
        deepDive: true,
      })),
    ],
    projects: profile.experience.flatMap((role, i) =>
      role.projects.map((project, j): LeafSpec => ({
        id: `project:${i}:${j}`,
        category: 'projects',
        label: project.name,
        sublabel: role.company,
        tooltip: [project.name, project.technologies.join(', ')].filter(Boolean).join(' · '),
        deepDive: true,
      }))
    ),
    skills: [
      ...skills.slice(0, MAX_SKILLS).map(({ skill, index, companies }): LeafSpec => ({
        id: `skill:${index}`,
        category: 'skills',
        label: skill,
        sublabel: companies.length ? `Used in ${companies.length} role${companies.length === 1 ? '' : 's'}` : 'Not in work history',
        tooltip: companies.length ? `${skill}: used at ${companies.join(', ')}` : `${skill}: listed, not mentioned in any role`,
        deepDive: true,
      })),
      ...(hidden > 0
        ? [{ id: 'more:skills', category: 'skills' as const, label: `+${hidden} more skills`, sublabel: 'See the Details tab', tooltip: 'Show all skills in the Details tab', deepDive: false }]
        : []),
    ],
    online: profile.profileLinks.map((link, i) => ({
      id: `link:${i}`,
      category: 'online',
      label: link.platform || hostOf(link.url),
      sublabel: hostOf(link.url),
      tooltip: link.url,
      deepDive: true,
    })),
  }
}

// Horizontal S-curve between two points
const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const mid = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
}

export const buildCandidateGraph = (profile: CandidateProfile): CandidateGraphModel => {
  const specs = leavesByCategory(profile)
  // An empty category still takes one row, so its hub shows "0"
  const sideHeight = (side: 'left' | 'right') =>
    SIDES[side].reduce((h, cat) => h + Math.max(1, specs[cat].length) * GRAPH.row, 0) + (SIDES[side].length - 1) * GRAPH.groupGap

  const height = Math.max(GRAPH.minHeight, Math.max(sideHeight('left'), sideHeight('right')) + GRAPH.padding * 2)
  const center = { x: GRAPH.width / 2, y: height / 2 }

  const hubs: GraphHub[] = []
  const leaves: GraphLeaf[] = []
  const edges: GraphEdge[] = []

  for (const side of ['left', 'right'] as const) {
    let y = (height - sideHeight(side)) / 2
    const dir = side === 'left' ? -1 : 1
    const hubX = GRAPH.hubX[side]
    const hubInner = hubX - (dir * GRAPH.hubWidth) / 2
    const hubOuter = hubX + (dir * GRAPH.hubWidth) / 2
    const leafInner = side === 'left' ? GRAPH.leafX.left + GRAPH.leafWidth : GRAPH.leafX.right

    for (const category of SIDES[side]) {
      const items = specs[category]
      const rows = Math.max(1, items.length)
      const hubY = y + (rows * GRAPH.row) / 2
      hubs.push({ category, label: HUB_LABELS[category], count: items.filter(i => i.deepDive).length, side, x: hubX, y: hubY })
      edges.push({ id: `center-${category}`, path: curve(center.x + dir * GRAPH.centerRadius, center.y, hubInner, hubY) })

      items.forEach((spec, i) => {
        const leafY = y + i * GRAPH.row + GRAPH.row / 2
        leaves.push({ ...spec, x: side === 'left' ? GRAPH.leafX.left : GRAPH.leafX.right, y: leafY })
        edges.push({ id: `${category}-${spec.id}`, path: curve(hubOuter, hubY, leafInner, leafY) })
      })

      y += rows * GRAPH.row + GRAPH.groupGap
    }
  }

  return { width: GRAPH.width, height, center, hubs, leaves, edges }
}

// Which research agent a node runs, as shown to the user
export const deepDiveTypeLabel = (targetId: string) => {
  const kind = targetId.split(':')[0]
  return {
    candidate: 'Identity',
    role: 'Career',
    project: 'Project',
    link: 'Online presence',
    skill: 'Skill',
    education: 'Credentials',
    certification: 'Credentials',
  }[kind] ?? 'Deep dive'
}
