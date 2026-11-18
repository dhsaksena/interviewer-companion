
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn()
}));

vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: mockInvoke
    })
  }))
}));

import { ResumeAnalysisAgent } from '../../../src/agents/resume-analysis/resumeAnalysisAgent.js';

describe('ResumeAnalysisAgent', () => {

  beforeEach(() => {
    vi.clearAllMocks();

    mockInvoke.mockResolvedValue({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      skills: ['Java', 'Spring Boot', 'Kafka'],
      experience: 8
    });
  });

  it('should extract candidate information from resume text', async () => {
    const agent = new ResumeAnalysisAgent();

    const result = await agent.execute({
      resumeText: 'John Doe has 8 years of experience in Java...'
    });

    expect(result).toBeDefined();

    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

});
