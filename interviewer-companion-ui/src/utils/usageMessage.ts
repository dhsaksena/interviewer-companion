import type { InterviewUsage } from '../types'

export const usageMessage = (what: string, usage: InterviewUsage[]) => {
  const base = `Delete ${what}? This cannot be undone.`
  if (usage.length === 0) return base
  const names = usage.slice(0, 3).map(u => u.candidateName ? `${u.title} (${u.candidateName})` : u.title).join(', ')
  const more = usage.length > 3 ? ` and ${usage.length - 3} more` : ''
  return `${base} It is used in ${usage.length} ${usage.length === 1 ? 'interview' : 'interviews'} (${names}${more}) and will be removed from them.`
}
