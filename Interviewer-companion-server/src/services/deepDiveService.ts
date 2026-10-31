import { randomUUID } from 'crypto'
import { candidate360Workflow, RESEARCH_NODE } from '../workflows/candidate360Workflow.js'
import { FINDINGS_FIELD, PLACEHOLDER_AGENTS } from '../workflows/deepDiveAgents.js'
import { ProgressTracker } from '../utils/progressTracker.js'
import type { Candidate } from '../types/candidate.js'
import type { CandidateProfile } from '../types/candidateProfile.js'
import type { DeepDiveResult, DeepDiveTarget, DeepDiveType } from '../types/deepDive.js'
import type { ProgressListener } from '../types/progress.js'

export const DEEP_DIVE_STEPS = [
  { key: 'plan', label: 'Plan the deep dive' },
  { key: 'research', label: 'Research' },
  { key: 'validate', label: 'Validate findings' },
]

const RESEARCH_NODES = new Set<string>(Object.values(RESEARCH_NODE))

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Companies whose role text mentions the skill (whole-term match, so "Java" doesn't match "JavaScript")
const rolesMentioning = (profile: CandidateProfile, skill: string) => {
  const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegex(skill.toLowerCase())}($|[^a-z0-9+#])`)
  return profile.experience
    .filter(role => pattern.test([role.title, ...role.description, ...role.projects.flatMap(p => [p.name, p.description, ...p.technologies, ...p.contributions])].join(' \n ').toLowerCase()))
    .map(role => role.company || role.title)
}

// Maps a graph node id to what the workflow should research. The type comes from the id,
// never from the client, so a node can only run the agent meant for it.
export const resolveTarget = (profile: CandidateProfile, targetId: string): DeepDiveTarget | null => {
  const [kind, a, b] = targetId.split(':')
  const i = Number(a)
  const j = Number(b)
  const make = (type: DeepDiveType, label: string, context: Record<string, unknown>): DeepDiveTarget => ({ type, targetId, label, context })

  switch (kind) {
    case 'candidate':
      return make('identity', profile.fullName, {
        fullName: profile.fullName, headline: profile.headline, location: profile.location, email: profile.email,
      })
    case 'role': {
      const role = profile.experience[i]
      return role ? make('career', `${role.title} at ${role.company}`, { ...role }) : null
    }
    case 'project': {
      const role = profile.experience[i]
      const project = role?.projects[j]
      return project ? make('project', project.name, { ...project, company: role.company }) : null
    }
    case 'link': {
      const link = profile.profileLinks[i]
      return link ? make('publicFootprint', link.platform || link.url, { ...link }) : null
    }
    case 'skill': {
      const skill = profile.skills[i]
      return skill ? make('skill', skill, { skill, mentionedIn: rolesMentioning(profile, skill) }) : null
    }
    case 'education': {
      const edu = profile.education[i]
      return edu ? make('identity', edu.institution, { ...edu }) : null
    }
    case 'certification': {
      const certification = profile.certifications[i]
      return certification ? make('identity', certification, { certification }) : null
    }
    default:
      return null
  }
}

interface RunOptions {
  onProgress?: ProgressListener
  signal?: AbortSignal
}

export const runDeepDive = async (candidate: Candidate, target: DeepDiveTarget, { onProgress, signal }: RunOptions = {}): Promise<DeepDiveResult> => {
  const progress = new ProgressTracker(DEEP_DIVE_STEPS, onProgress)
  const workflowId = randomUUID()
  const findingsField = FINDINGS_FIELD[target.type]
  let findings: string[] = []
  let warnings: string[] = []

  progress.step('plan', 'active', { percent: 5, message: 'Starting the workflow' })

  const stream = await candidate360Workflow.stream(
    { workflowId, candidateProfile: candidate.profile, deepDive: target },
    { streamMode: 'updates', signal }
  )

  try {
    for await (const chunk of stream) {
      for (const [node, update] of Object.entries(chunk as Record<string, Record<string, unknown> | undefined>)) {
        if (node === 'plan') {
          progress.step('plan', 'done', { percent: 20, message: 'Planned' })
          progress.step('research', 'active', { percent: 25, message: `Researching ${target.label}` })
        } else if (RESEARCH_NODES.has(node)) {
          findings = (update?.[findingsField] as string[] | undefined) ?? []
          progress.step('research', 'done', { percent: 80, message: 'Research finished', detail: `${findings.length} finding${findings.length === 1 ? '' : 's'}` })
          progress.step('validate', 'active', { percent: 85, message: 'Validating findings' })
        } else if (node === 'validate') {
          warnings = (update?.validationWarnings as string[] | undefined) ?? []
          progress.step('validate', 'done', { percent: 100, message: 'Deep dive complete' })
        }
      }
    }
  } catch (error) {
    progress.failActive()
    throw error
  }

  return {
    workflowId,
    type: target.type,
    targetId: target.targetId,
    label: target.label,
    status: 'completed',
    findings,
    warnings,
    placeholder: PLACEHOLDER_AGENTS,
    completedAt: new Date().toISOString(),
  }
}
