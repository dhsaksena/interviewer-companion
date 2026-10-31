import { StateSchema, ReducedValue} from '@langchain/langgraph'
import { z } from 'zod'

import { DEEP_DIVE_TYPES } from '../types/deepDive.js'

const Candidate360StateSchema = new StateSchema({
    workflowId: z.string(),
    // Not stored after import, so deep dives run from the extracted profile
    resumeText : z.string().default(''),

    status: z.enum([
    'pending',
    'extracting',
    'researching',
    'validating',
    'completed',
    'failed']).default('pending'),

    candidateProfile: z.any().optional(),

  // The graph node the user clicked: which research agent runs, and on what
  deepDive: z.object({
    type: z.enum(DEEP_DIVE_TYPES),
    targetId: z.string(),
    label: z.string(),
    context: z.record(z.string(), z.unknown()),
  }).optional(),

  identityFindings: new ReducedValue(
    z.array(z.string()).default([]),
    {
      reducer: (current, update) => [...current, ...update]
    }
  ),

  careerFindings: new ReducedValue(
    z.array(z.string()).default([]),
    {
      reducer: (current, update) => [...current, ...update]
    }
  ),

  projectFindings: new ReducedValue(
    z.array(z.string()).default([]),
    {
      reducer: (current, update) => [...current, ...update]
    }
  ),

  publicFootprintFindings: new ReducedValue(
    z.array(z.string()).default([]),
    {
      reducer: (current, update) => [...current, ...update]
    }
  ),

  skillFindings: new ReducedValue(
    z.array(z.string()).default([]),
    {
      reducer: (current, update) => [...current, ...update]
    }
  ),

  validationWarnings: z.array(z.string()).default([]),

  error: z.string().optional()
})


export default Candidate360StateSchema

