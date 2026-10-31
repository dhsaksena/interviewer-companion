import type { ProgressEvent } from '../types'
import { apiFetch } from './apiFetch'

// POSTs and reads a text/event-stream response: `progress` events go to onProgress, and the promise
// resolves with the `complete` event's data or rejects with the `error` event's message.
// (EventSource can't send a POST body, so the stream is read from fetch directly.)
export const postSse = async <T>(
  url: string,
  init: RequestInit,
  onProgress: (event: ProgressEvent) => void,
): Promise<T> => {
  const response = await apiFetch(url, { ...init, method: 'POST', headers: { ...init.headers, Accept: 'text/event-stream' } })

  // Validation errors (bad file, unknown node...) come back as plain JSON before the stream starts
  if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed: ${response.statusText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: { value: T } | null = null

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let boundary
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      let event = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
      }
      if (data.length === 0) continue // heartbeat comment

      const payload = JSON.parse(data.join('\n'))
      if (event === 'progress') onProgress(payload)
      else if (event === 'complete') result = { value: payload }
      else if (event === 'error') throw new Error(payload.message ?? 'Something went wrong')
    }
  }

  if (!result) throw new Error('The connection closed before the server finished')
  return result.value
}
