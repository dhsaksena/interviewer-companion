import { END, START, StateGraph } from '@langchain/langgraph'
import Candidate360StateSchema from './candidate360State.js'
import {
  FINDINGS_FIELD,
  careerResearch,
  identityResearch,
  projectResearch,
  publicFootprintResearch,
  skillResearch,
} from './deepDiveAgents.js'
import type { DeepDiveType } from '../types/deepDive.js'

type State = typeof Candidate360StateSchema.State

// plan -> one research agent (picked by the clicked node's type) -> validate
export const RESEARCH_NODE = {
  identity: 'identityResearch',
  career: 'careerResearch',
  project: 'projectResearch',
  publicFootprint: 'publicFootprintResearch',
  skill: 'skillResearch',
} as const satisfies Record<DeepDiveType, string>

const plan = async (state: State) => {
  if (!state.deepDive) throw new Error('No deep-dive target given')
  return { status: 'researching' as const }
}

const validate = async (state: State) => {
  const type = state.deepDive!.type
  const findings = state[FINDINGS_FIELD[type]]
  return {
    status: 'completed' as const,
    validationWarnings: findings.length === 0 ? ['The research step returned no findings.'] : [],
  }
}

export const candidate360Workflow = new StateGraph(Candidate360StateSchema)
  .addNode('plan', plan)
  .addNode(RESEARCH_NODE.identity, identityResearch)
  .addNode(RESEARCH_NODE.career, careerResearch)
  .addNode(RESEARCH_NODE.project, projectResearch)
  .addNode(RESEARCH_NODE.publicFootprint, publicFootprintResearch)
  .addNode(RESEARCH_NODE.skill, skillResearch)
  .addNode('validate', validate)
  .addEdge(START, 'plan')
  .addConditionalEdges('plan', state => RESEARCH_NODE[state.deepDive!.type], Object.values(RESEARCH_NODE))
  .addEdge(RESEARCH_NODE.identity, 'validate')
  .addEdge(RESEARCH_NODE.career, 'validate')
  .addEdge(RESEARCH_NODE.project, 'validate')
  .addEdge(RESEARCH_NODE.publicFootprint, 'validate')
  .addEdge(RESEARCH_NODE.skill, 'validate')
  .addEdge('validate', END)
  .compile()
