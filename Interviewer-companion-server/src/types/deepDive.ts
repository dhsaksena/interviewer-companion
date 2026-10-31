// Which research agent a graph node runs. Kept in step with the findings fields of Candidate360State.
export const DEEP_DIVE_TYPES = ['identity', 'career', 'project', 'publicFootprint', 'skill'] as const
export type DeepDiveType = (typeof DEEP_DIVE_TYPES)[number]

// A node of the candidate graph that a deep dive can run on.
// targetId formats: "candidate", "role:<i>", "project:<role>:<i>", "link:<i>", "skill:<i>",
// "education:<i>", "certification:<i>" (indexes into the stored profile)
export interface DeepDiveTarget {
  type: DeepDiveType
  targetId: string
  label: string
  context: Record<string, unknown>
}

export interface DeepDiveResult {
  workflowId: string
  type: DeepDiveType
  targetId: string
  label: string
  status: 'completed' | 'failed'
  findings: string[]
  warnings: string[]
  // True while the research agents are placeholders
  placeholder: boolean
  completedAt: string
}
