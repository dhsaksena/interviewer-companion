import type { Interview, InterviewInput, InterviewListQuery, InterviewSummary, InterviewUsage } from '../types'
import { API_URL, apiFetch } from './apiFetch'

const request = async (path: string, options: RequestInit = {}) => {
  const response = await apiFetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed: ${response.statusText}`)
  }

  return response.status === 204 ? null : response.json()
}

const jsonBody = (body: object) => JSON.stringify(body)

export const fetchInterviews = (query: InterviewListQuery): Promise<{ items: InterviewSummary[]; total: number }> => {
  const params = new URLSearchParams({
    q: query.q,
    sort: query.sort,
    dir: query.dir,
    page: String(query.page),
    pageSize: String(query.pageSize),
    questions: query.questions,
    status: query.status,
  })
  return request(`/interviews?${params}`)
}

export const fetchInterview = (id: number): Promise<Interview> => request(`/interviews/${id}`)

export const createInterview = (input: InterviewInput): Promise<Interview> =>
  request('/interviews', { method: 'POST', body: jsonBody(input) })

export const updateInterview = (id: number, input: InterviewInput): Promise<Interview> =>
  request(`/interviews/${id}`, { method: 'PUT', body: jsonBody(input) })

export const deleteInterview = (id: number) => request(`/interviews/${id}`, { method: 'DELETE' })

export const duplicateInterview = (id: number, title: string, candidateName: string): Promise<Interview> =>
  request(`/interviews/${id}/duplicate`, { method: 'POST', body: jsonBody({ title, candidateName }) })

export const fetchQuestionUsage = (questionId: number): Promise<InterviewUsage[]> =>
  request(`/interviews/by-question/${questionId}`)

// The shape the API accepts for saving, built from a loaded interview
export const toInterviewInput = (interview: Interview): InterviewInput => ({
  title: interview.title,
  candidateName: interview.candidateName,
  notes: interview.notes,
  status: interview.status,
  interviewDate: interview.interviewDate,
  rubrics: interview.rubrics.map(r => ({
    title: r.title,
    description: r.description,
    rating: r.rating,
    feedback: r.feedback,
    questionIds: r.questions.map(q => q.id),
  })),
})
