import type { Candidate, CandidateSummary, DeepDiveResult, ProgressEvent } from '../types'
import { API_URL, apiFetch } from './apiFetch'
import { postSse } from './sse'

const request = async (path: string, options: RequestInit = {}) => {
  const response = await apiFetch(`${API_URL}${path}`, options)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed: ${response.statusText}`)
  }

  return response.status === 204 ? null : response.json()
}

export const fetchCandidates = (q: string, page: number, pageSize: number): Promise<{ items: CandidateSummary[]; total: number }> =>
  request(`/candidates?${new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) })}`)

export const fetchCandidate = (id: number): Promise<Candidate> => request(`/candidates/${id}`)

// Uploads the resume and reports progress as the server reads and analyzes it.
// Aborting the signal cancels the import on the server too.
export const importResume = (file: File, onProgress: (event: ProgressEvent) => void, signal?: AbortSignal): Promise<Candidate> => {
  const body = new FormData()
  body.append('resume', file)
  return postSse(`${API_URL}/candidates/import`, { body, signal }, onProgress)
}

// Runs the Candidate 360 workflow for one node of the graph
export const runDeepDive = (
  candidateId: number,
  targetId: string,
  onProgress: (event: ProgressEvent) => void,
  signal?: AbortSignal,
): Promise<DeepDiveResult> =>
  postSse(
    `${API_URL}/candidates/${candidateId}/deep-dives`,
    { body: JSON.stringify({ targetId }), headers: { 'Content-Type': 'application/json' }, signal },
    onProgress,
  )

export const deleteCandidate = (id: number) => request(`/candidates/${id}`, { method: 'DELETE' })
