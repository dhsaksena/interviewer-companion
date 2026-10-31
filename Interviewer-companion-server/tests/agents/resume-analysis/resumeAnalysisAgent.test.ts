import { describe, it, expect } from 'vitest'
import { ResumeAnalysisAgent } from '../../../src/agents/resume-analysis/resumeAnalysisAgent.js'


describe('ResumeAnalysisAgent', () => {
  it('should extract candidate information from resume text', async () => {
    const agent = new ResumeAnalysisAgent()

    const result = await agent.execute({
      resumeText: `
        John Doe
        Senior Software Engineer

        Experience:
        ABC Technologies (2020 - Present)
        Built distributed payment systems using Java, Kafka and MySQL.

        Education:
        B.Tech in Computer Science
        XYZ University (2012 - 2016)
      `
    })

    expect(result.candidateProfile.fullName).toBe('John Doe')
    expect(result.candidateProfile.experience.length).toBeGreaterThan(0)
    expect(result.candidateProfile.education.length).toBeGreaterThan(0)
  }, 30000)
})
