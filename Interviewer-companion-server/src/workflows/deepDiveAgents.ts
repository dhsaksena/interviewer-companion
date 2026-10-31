import type Candidate360StateSchema from './candidate360State.js'
import type { DeepDiveType } from '../types/deepDive.js'

type State = typeof Candidate360StateSchema.State
type Update = typeof Candidate360StateSchema.Update

// PLACEHOLDER research agents: one per deep-dive type. Each currently restates what the resume
// says about the target. Replace the body of each with the real sub-agent (web research,
// verification, ...) and flip PLACEHOLDER_AGENTS to false once they are all real.
export const PLACEHOLDER_AGENTS = true

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : [])
const period = (start: unknown, end: unknown) => [text(start), text(end)].filter(Boolean).join(' – ')

const contextOf = (state: State) => state.deepDive?.context ?? {}

export const identityResearch = async (state: State): Promise<Update> => {
  const c = contextOf(state)
  const findings = [
    text(c.fullName) && `Name on the resume: ${text(c.fullName)}`,
    text(c.headline) && `Current title: ${text(c.headline)}`,
    text(c.location) && `Location: ${text(c.location)}`,
    text(c.institution) && `Studied at ${text(c.institution)}${text(c.degree) ? ` (${[text(c.degree), text(c.fieldOfStudy)].filter(Boolean).join(', ')})` : ''}${period(c.startDate, c.endDate) ? `, ${period(c.startDate, c.endDate)}` : ''}`,
    text(c.certification) && `Certification listed: ${text(c.certification)}`,
  ].filter(Boolean) as string[]
  return { identityFindings: findings }
}

export const careerResearch = async (state: State): Promise<Update> => {
  const c = contextOf(state)
  const projects = Array.isArray(c.projects) ? c.projects.length : 0
  const duties = list(c.description).length
  return {
    careerFindings: [
      `${text(c.title) || 'Role'} at ${text(c.company) || 'an unnamed company'}${period(c.startDate, c.endDate) ? `, ${period(c.startDate, c.endDate)}` : ''}`,
      `${duties} responsibilit${duties === 1 ? 'y' : 'ies'} and ${projects} project${projects === 1 ? '' : 's'} listed for this role`,
      ...list(c.description).slice(0, 3).map(d => `Resume says: ${d}`),
    ],
  }
}

export const projectResearch = async (state: State): Promise<Update> => {
  const c = contextOf(state)
  return {
    projectFindings: [
      `${text(c.name) || 'Project'}${text(c.company) ? ` (at ${text(c.company)})` : ''}`,
      text(c.description) && `Description: ${text(c.description)}`,
      list(c.technologies).length > 0 && `Technologies: ${list(c.technologies).join(', ')}`,
      ...list(c.contributions).map(d => `Contribution: ${d}`),
    ].filter(Boolean) as string[],
  }
}

export const publicFootprintResearch = async (state: State): Promise<Update> => {
  const c = contextOf(state)
  return {
    publicFootprintFindings: [`${text(c.platform) || 'Profile'} link on the resume: ${text(c.url)}`],
  }
}

export const skillResearch = async (state: State): Promise<Update> => {
  const c = contextOf(state)
  const roles = list(c.mentionedIn)
  return {
    skillFindings: [
      `Skill listed: ${text(c.skill)}`,
      roles.length > 0 ? `Mentioned in the work history at ${roles.join(', ')}` : 'Not mentioned in any role description or project',
    ],
  }
}

// Which state field each research agent writes to
export const FINDINGS_FIELD: Record<DeepDiveType, 'identityFindings' | 'careerFindings' | 'projectFindings' | 'publicFootprintFindings' | 'skillFindings'> = {
  identity: 'identityFindings',
  career: 'careerFindings',
  project: 'projectFindings',
  publicFootprint: 'publicFootprintFindings',
  skill: 'skillFindings',
}
