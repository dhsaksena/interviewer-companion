import { z } from 'zod'
import { parsePartialJson } from '@langchain/core/output_parsers'
import { ModelFactory } from '../../services/modelFactory.js'
import { RESUME_ANALYSIS_SYSTEM_PROMPT } from './prompts.js'
import type {
  ResumeAnalysisInput,
  ResumeAnalysisOutput
} from './types.js'

// Must not match a key of the schema: named "candidate_profile", the model wrapped its answer
// in an extra { candidateProfile: ... } level
const TOOL_NAME = 'record_resume_extraction'

// Defensive: undo that extra wrapping if a model still produces it
const unwrap = (value: unknown) => {
  const outer = value as { candidateProfile?: { candidateProfile?: unknown } } | null
  return outer?.candidateProfile?.candidateProfile ? outer.candidateProfile : value
}

export interface ResumeAnalysisStreamOptions {
  // Called with the profile parsed so far (fields appear in schema order as the model writes them)
  onPartial?: (partial: Partial<ResumeAnalysisOutput> & { candidateProfile?: Record<string, unknown> }) => void
  signal?: AbortSignal
}

// The 360 view plots dates on a timeline, so ask for a parseable format
const DateSchema = z.string().optional().describe(
  '"YYYY-MM" if the month is known, otherwise "YYYY". Use "Present" for an ongoing end date.'
)

// Runtime schema for the model response
const ResumeExtractionSchema = z.object({
  candidateProfile: z.object({
    fullName: z.string(),
    headline: z.string().optional().describe('Current or most recent job title'),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),

    profileLinks: z.array(
      z.object({
        platform: z.string(),
        url: z.string()
      })
    ),

    education: z.array(
      z.object({
        institution: z.string(),
        degree: z.string().optional(),
        fieldOfStudy: z.string().optional(),
        startDate: DateSchema,
        endDate: DateSchema
      })
    ),

    experience: z.array(
      z.object({
        company: z.string(),
        title: z.string(),
        startDate: DateSchema,
        endDate: DateSchema,
        description: z.array(z.string()),

        projects: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            technologies: z.array(z.string()),
            contributions: z.array(z.string())
          })
        )
      })
    ).describe('Most recent role first'),

    skills: z.array(z.string()),
    certifications: z.array(z.string())
  }),
  warnings: z.array(z.string())
})

export class ResumeAnalysisAgent {

  private baseModel = ModelFactory.create()

  private model = this.baseModel.withStructuredOutput(
    ResumeExtractionSchema
  )

  private messages(input: ResumeAnalysisInput) {
    if (!input.resumeText.trim()) {
      throw new Error('Resume text cannot be empty')
    }

    return [
      {
        role: 'system',
        content: RESUME_ANALYSIS_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `Extract candidate information from this resume:\n\n${input.resumeText}`
      }
    ]
  }

  async execute(
    input: ResumeAnalysisInput
  ): Promise<ResumeAnalysisOutput> {

    const result = await this.model.invoke(this.messages(input))

    return result
  }

  // Same extraction, but reports the partially-built profile while the model is still writing it.
  // withStructuredOutput can't stream partial results, so the schema is bound as a forced tool
  // and the tool-call arguments are parsed as partial JSON as they arrive.
  async executeStreaming(
    input: ResumeAnalysisInput,
    options: ResumeAnalysisStreamOptions = {}
  ): Promise<ResumeAnalysisOutput> {

    if (!this.baseModel.bindTools) {
      throw new Error('The configured model does not support tool calling')
    }

    const stream = await this.baseModel
      .bindTools(
        [{ name: TOOL_NAME, description: 'Record the structured data extracted from the resume', schema: ResumeExtractionSchema }],
        { tool_choice: TOOL_NAME }
      )
      .stream(this.messages(input), { signal: options.signal })

    let args = ''
    for await (const chunk of stream) {
      const delta = (chunk.tool_call_chunks ?? []).map(c => c.args ?? '').join('')
      if (!delta) continue
      args += delta
      const partial = parsePartialJson(args)
      if (partial) options.onPartial?.(unwrap(partial) as Parameters<NonNullable<ResumeAnalysisStreamOptions['onPartial']>>[0])
    }

    return ResumeExtractionSchema.parse(unwrap(JSON.parse(args)))
  }
}