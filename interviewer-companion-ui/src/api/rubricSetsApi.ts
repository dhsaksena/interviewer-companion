import type { RubricSet, RubricSetInput, RubricSetInterviewRef, RubricSetSummary } from '../types'
import { API_URL, apiFetch } from './apiFetch'

const request = async (path: string, options: RequestInit = {}) => {
  const response = await apiFetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    // The server answers 409 for a duplicate name
    if (response.status === 409) throw new Error('A rubric set with this name already exists')
    throw new Error(body?.error ?? `Request failed: ${response.statusText}`)
  }

  return response.status === 204 ? null : response.json()
}

export const fetchRubricSets = (q = ''): Promise<RubricSetSummary[]> =>
  request(`/rubric-sets${q ? `?${new URLSearchParams({ q })}` : ''}`)

export const fetchRubricSet = (id: number): Promise<RubricSet> => request(`/rubric-sets/${id}`)

export const createRubricSet = (input: RubricSetInput): Promise<RubricSet> =>
  request('/rubric-sets', { method: 'POST', body: JSON.stringify(input) })

export const updateRubricSet = (id: number, input: RubricSetInput): Promise<RubricSet> =>
  request(`/rubric-sets/${id}`, { method: 'PUT', body: JSON.stringify(input) })

export const deleteRubricSet = (id: number) => request(`/rubric-sets/${id}`, { method: 'DELETE' })

export const duplicateRubricSet = (id: number, name: string): Promise<RubricSet> =>
  request(`/rubric-sets/${id}/duplicate`, { method: 'POST', body: JSON.stringify({ name }) })

export const fetchRubricSetInterviews = (id: number): Promise<RubricSetInterviewRef[]> =>
  request(`/rubric-sets/${id}/interviews`)
